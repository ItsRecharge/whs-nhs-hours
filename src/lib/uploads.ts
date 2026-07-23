import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import { createReadStream, existsSync } from "fs";
import path from "path";
import crypto from "crypto";

/**
 * Proof-photo storage for hour reports. Files live on local disk (outside
 * public/) and are served through the authenticated /api/uploads route.
 * Stored names are always server-generated UUIDs — user filenames never touch
 * the filesystem.
 */

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB

// Sniffed magic bytes → extension. Only common photo formats.
const SIGNATURES: { ext: string; mime: string; match: (b: Buffer) => boolean }[] = [
  {
    ext: "jpg",
    mime: "image/jpeg",
    match: (b) => b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    ext: "png",
    mime: "image/png",
    match: (b) =>
      b.length > 8 && b.subarray(0, 8).equals(Buffer.from("\x89PNG\r\n\x1a\n", "binary")),
  },
  {
    ext: "webp",
    mime: "image/webp",
    match: (b) =>
      b.length > 12 &&
      b.subarray(0, 4).toString("ascii") === "RIFF" &&
      b.subarray(8, 12).toString("ascii") === "WEBP",
  },
];

export function uploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

export type PhotoSaveResult =
  | { ok: true; relPath: string }
  | { ok: false; error: string };

/**
 * Validates and stores a proof photo. Returns a relative path like
 * "hour-reports/2026/07/<uuid>.jpg" to persist on the report.
 */
export async function savePhotoUpload(file: File): Promise<PhotoSaveResult> {
  if (file.size > MAX_PHOTO_BYTES) {
    return { ok: false, error: "Photo is too large (10 MB max)." };
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGNATURES.find((s) => s.match(buf));
  if (!sig) {
    return {
      ok: false,
      error: "Unsupported image format — use a JPEG, PNG, or WebP photo.",
    };
  }

  const now = new Date();
  const yyyy = String(now.getUTCFullYear());
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  const relDir = path.join("hour-reports", yyyy, mm);
  const relPath = path.join(relDir, `${crypto.randomUUID()}.${sig.ext}`);

  await mkdir(path.join(uploadDir(), relDir), { recursive: true });
  await writeFile(path.join(uploadDir(), relPath), buf);
  return { ok: true, relPath };
}

export async function deletePhoto(relPath: string): Promise<void> {
  const abs = resolveUploadPath(relPath);
  if (!abs) return;
  await unlink(abs).catch(() => {});
}

/**
 * Resolves a stored relative path to an absolute path inside the upload dir,
 * or null if it escapes it (path traversal) or doesn't exist.
 */
export function resolveUploadPath(relPath: string): string | null {
  const base = path.resolve(uploadDir());
  const abs = path.resolve(base, relPath);
  if (!abs.startsWith(base + path.sep)) return null;
  if (!existsSync(abs)) return null;
  return abs;
}

export function contentTypeForPath(relPath: string): string {
  const ext = path.extname(relPath).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  return "image/jpeg";
}

export { createReadStream, readFile };
