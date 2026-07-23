import { promises as fs } from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = path.resolve(process.cwd());
const MAX_TEXT_BYTES = 1_000_000;
const MAX_GIT_OUTPUT = 64 * 1024;

const BLOCKED_SEGMENTS = new Set(["data", "node_modules", ".next", ".git"]);

export interface OpsEntry {
  name: string;
  path: string;
  kind: "file" | "dir";
}

export interface OpsFileSnapshot {
  path: string;
  content: string;
  size: number;
}

export interface OpsWorkspaceSnapshot {
  directory: string;
  entries: OpsEntry[];
  file: OpsFileSnapshot | null;
}

function truncateOutput(output: string): string {
  if (output.length <= MAX_GIT_OUTPUT) return output.trim();
  return `${output.slice(0, MAX_GIT_OUTPUT).trim()}\n… output truncated …`;
}

function normalizeRelativePath(input = ""): string {
  const raw = input.trim().replace(/\\/g, "/");
  if (!raw || raw === ".") return "";
  if (path.posix.isAbsolute(raw)) {
    throw new Error("Path must stay inside the project root.");
  }
  const normalized = path.posix.normalize(raw);
  if (normalized === ".") return "";
  if (normalized === ".." || normalized.startsWith("../") || normalized.includes("/../")) {
    throw new Error("Path traversal is not allowed.");
  }
  const parts = normalized.split("/").filter(Boolean);
  if (
    parts.some(
      (part) =>
        BLOCKED_SEGMENTS.has(part) || part === ".env" || part.startsWith(".env."),
    )
  ) {
    throw new Error("That path is blocked.");
  }
  return parts.join("/");
}

async function assertRealPathInsideRoot(absPath: string): Promise<void> {
  const real = await fs.realpath(absPath);
  if (!real.startsWith(`${PROJECT_ROOT}${path.sep}`) && real !== PROJECT_ROOT) {
    throw new Error("Path escapes the project root.");
  }
}

async function resolveExistingTarget(relativePath: string): Promise<string> {
  const normalized = normalizeRelativePath(relativePath);
  const absPath = path.resolve(PROJECT_ROOT, normalized);
  await assertRealPathInsideRoot(absPath);
  return absPath;
}

async function resolveWriteTarget(relativePath: string): Promise<string> {
  const normalized = normalizeRelativePath(relativePath);
  const absPath = path.resolve(PROJECT_ROOT, normalized);
  const parent = path.dirname(absPath);
  await assertRealPathInsideRoot(parent);
  if (await exists(absPath)) {
    await assertRealPathInsideRoot(absPath);
  }
  return absPath;
}

async function exists(absPath: string): Promise<boolean> {
  try {
    await fs.access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function listOpsDirectory(relativePath = ""): Promise<OpsEntry[]> {
  const normalized = normalizeRelativePath(relativePath);
  const absPath = await resolveExistingTarget(normalized);
  const stat = await fs.stat(absPath);
  if (!stat.isDirectory()) {
    throw new Error("Not a directory.");
  }

  const entries = await fs.readdir(absPath, { withFileTypes: true });
  return entries
    .filter((entry) => !BLOCKED_SEGMENTS.has(entry.name) && !entry.name.startsWith(".env"))
    .map((entry) => ({
      name: entry.name,
      path: normalized ? path.posix.join(normalized, entry.name) : entry.name,
      kind: (entry.isDirectory() ? "dir" : "file") as "dir" | "file",
    }))
    .sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export async function readOpsFile(relativePath: string): Promise<OpsFileSnapshot> {
  const absPath = await resolveExistingTarget(relativePath);
  const stat = await fs.stat(absPath);
  if (!stat.isFile()) {
    throw new Error("Not a file.");
  }
  if (stat.size > MAX_TEXT_BYTES) {
    throw new Error("File is too large to edit in the console.");
  }
  const content = await fs.readFile(absPath, "utf8");
  if (content.includes("\0")) {
    throw new Error("Binary files are not supported.");
  }
  return { path: normalizeRelativePath(relativePath), content, size: stat.size };
}

export async function writeOpsFile(relativePath: string, content: string): Promise<void> {
  if (Buffer.byteLength(content, "utf8") > MAX_TEXT_BYTES) {
    throw new Error("File is too large to save in the console.");
  }
  if (content.includes("\0")) {
    throw new Error("Binary files are not supported.");
  }
  const absPath = await resolveWriteTarget(relativePath);
  await fs.writeFile(absPath, content, "utf8");
}

/**
 * Runs an arbitrary shell command inside the project root and returns its
 * combined stdout+stderr plus exit code. Privileged: callers MUST gate this
 * behind super-admin + a valid ops grant. Times out after 30s.
 */
export async function runShellCommand(
  command: string,
): Promise<{ output: string; exitCode: number }> {
  try {
    const { stdout, stderr } = await execFileAsync("/bin/bash", ["-lc", command], {
      cwd: PROJECT_ROOT,
      timeout: 30_000,
      maxBuffer: 256 * 1024,
      encoding: "utf8",
      env: process.env,
    });
    return { output: truncateOutput([stdout, stderr].filter(Boolean).join("\n")), exitCode: 0 };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; code?: number; message?: string };
    const body = [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message || "Command failed.";
    return { output: truncateOutput(body), exitCode: typeof e.code === "number" ? e.code : 1 };
  }
}

async function runGit(args: string[]): Promise<string> {
  try {
    const result = await execFileAsync("git", args, {
      cwd: PROJECT_ROOT,
      timeout: 30_000,
      maxBuffer: 128 * 1024,
      encoding: "utf8",
    });
    const stdout = typeof result === "string" ? result : result.stdout ?? "";
    const stderr = typeof result === "string" ? "" : result.stderr ?? "";
    return truncateOutput([stdout, stderr].filter(Boolean).join("\n"));
  } catch (err) {
    // A non-zero git exit (e.g. non-fast-forward, or a read-only .git) rejects.
    // Surface its output instead of throwing so the button shows the error.
    const e = err as { stdout?: string; stderr?: string; message?: string };
    const body =
      [e.stdout, e.stderr].filter(Boolean).join("\n") || e.message || "git command failed.";
    return truncateOutput(body);
  }
}

export async function gitHead(): Promise<{ branch: string; shortHead: string }> {
  const [branch, shortHead] = await Promise.all([
    runGit(["rev-parse", "--abbrev-ref", "HEAD"]),
    runGit(["rev-parse", "--short", "HEAD"]),
  ]);
  return { branch: branch.trim(), shortHead: shortHead.trim() };
}

export async function gitStatus(): Promise<string> {
  return runGit(["status", "-sb"]);
}

export async function gitFetch(): Promise<string> {
  return runGit(["fetch"]);
}

export async function gitPull(): Promise<string> {
  return runGit(["pull", "--ff-only"]);
}

export async function gitLog(): Promise<string> {
  return runGit(["log", "-n", "20", "--oneline"]);
}

export async function loadOpsWorkspace(relativePath = ""): Promise<OpsWorkspaceSnapshot> {
  const normalized = normalizeRelativePath(relativePath);
  try {
    const entries = await listOpsDirectory(normalized);
    return { directory: normalized, entries, file: null };
  } catch {
    const file = await readOpsFile(normalized);
    const directory = path.posix.dirname(file.path);
    const entries = await listOpsDirectory(directory === "." ? "" : directory);
    return { directory: directory === "." ? "" : directory, entries, file };
  }
}
