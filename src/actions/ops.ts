"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recordAudit } from "@/lib/services/audit-service";
import { verifyPassword } from "@/lib/services/auth-service";
import { listAdmins } from "@/lib/services/bootstrap-service";
import { requireUser } from "@/lib/current-user";
import { requireOpsGrant, isOpsConsoleEnabled, isSuperAdmin } from "@/lib/ops-access";
import { isTestMode, isTestModeAvailable, setTestMode } from "@/lib/test-mode";
import { signOpsGrant } from "@/lib/ops-grant";
import { OPS_GRANT_COOKIE, OPS_GRANT_TTL_SECONDS } from "@/lib/constants";
import { setFlash } from "@/lib/flash";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import {
  gitFetch,
  gitHead,
  gitLog,
  gitPull,
  gitStatus,
  runShellCommand,
  writeOpsFile,
} from "@/lib/services/ops-service";

export interface OpsShellState {
  command: string;
  output: string;
  exitCode: number | null;
  error?: string;
}

export async function requestOpsGrantAction(formData: FormData): Promise<void> {
  const user = await requireUser("officer");
  if (!isOpsConsoleEnabled()) {
    await setFlash("warning", "The operations console is disabled.");
    redirect("/officer/admin");
  }

  const password = String(formData.get("password") ?? "");
  if (!password) {
    await setFlash("warning", "Password is required.");
    redirect("/officer/ops");
  }

  const ip = await requestIp();
  if (!rateLimit(`ops-grant:${user.id}:${ip}`, 5, 15 * 60 * 1000)) {
    await setFlash("warning", "Too many attempts. Please try again later.");
    redirect("/officer/ops");
  }

  // The console is visible to every officer, but only an admin's password
  // unlocks it — so we verify against the admin accounts, not the current user.
  // The caller's own account is checked first when they are an admin.
  const admins = await listAdmins();
  admins.sort((a, b) => (a.id === user.id ? -1 : b.id === user.id ? 1 : 0));
  let unlocked = false;
  for (const admin of admins) {
    if (await verifyPassword(admin.passwordHash, password)) {
      unlocked = true;
      break;
    }
  }
  if (!unlocked) {
    await setFlash("danger", "That is not an admin's password.");
    redirect("/officer/ops");
  }

  const grant = await signOpsGrant({
    userId: user.id,
    email: user.email.toLowerCase(),
    bootstrap: user.isBootstrapOfficer,
  });
  (await cookies()).set(OPS_GRANT_COOKIE, grant, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/officer/ops",
    maxAge: OPS_GRANT_TTL_SECONDS,
  });

  await setFlash("success", "Terminal unlocked for 10 minutes.");
  redirect("/officer/ops");
}

export async function saveOpsFileAction(formData: FormData): Promise<void> {
  const user = await requireUser("officer");
  await requireOpsGrant(user);

  const path = String(formData.get("path") ?? "").trim();
  const content = String(formData.get("content") ?? "");
  if (!path) {
    await setFlash("danger", "Choose a file to save.");
    redirect("/officer/ops");
  }

  await writeOpsFile(path, content);
  await recordAudit({
    actor: user,
    action: "ops.file.write",
    summary: `Edited ${path} (${Buffer.byteLength(content, "utf8")} bytes)`,
    targetType: "file",
  });

  await setFlash("success", `Saved ${path}.`);
  redirect(`/officer/ops?path=${encodeURIComponent(path)}`);
}

export async function toggleTestModeAction(): Promise<void> {
  const user = await requireUser("officer");
  await requireOpsGrant(user);
  if (!isSuperAdmin(user) || !isTestModeAvailable()) {
    await setFlash("danger", "Test mode is only available to super admins on a local server.");
    redirect("/officer/ops");
  }

  // Log the switch itself while logging is still on (before enabling / after disabling).
  const turningOn = !isTestMode();
  if (turningOn) {
    await recordAudit({ actor: user, action: "ops.test_mode.on", summary: "Turned on test mode" });
    setTestMode(true);
  } else {
    setTestMode(false);
    await recordAudit({ actor: user, action: "ops.test_mode.off", summary: "Turned off test mode" });
  }

  await setFlash("success", turningOn ? "Test mode on — your edits won't be audit-logged." : "Test mode off.");
  redirect("/officer/ops");
}

export async function runOpsGitAction(formData: FormData): Promise<void> {
  const user = await requireUser("officer");
  await requireOpsGrant(user);

  const command = String(formData.get("command") ?? "");
  const path = String(formData.get("path") ?? "").trim();
  let output = "";

  switch (command) {
    case "status":
      output = await gitStatus();
      break;
    case "fetch":
      output = await gitFetch();
      break;
    case "pull":
      output = await gitPull();
      break;
    case "log":
      output = await gitLog();
      break;
    case "head": {
      const head = await gitHead();
      output = `${head.branch} @ ${head.shortHead}`;
      break;
    }
    default:
      await setFlash("danger", "Unknown git command.");
      redirect("/officer/ops");
  }

  await recordAudit({
    actor: user,
    action: `ops.git.${command}`,
    summary: `Ran git ${command}${output ? `: ${output.slice(0, 120)}` : ""}`,
  });

  const outputParam = output ? `&output=${encodeURIComponent(output)}` : "";
  redirect(`/officer/ops?path=${encodeURIComponent(path)}&git=${encodeURIComponent(command)}${outputParam}`);
}

export async function runOpsShellAction(
  _prev: OpsShellState,
  formData: FormData,
): Promise<OpsShellState> {
  const user = await requireUser("officer");
  await requireOpsGrant(user);

  const command = String(formData.get("command") ?? "").trim();
  if (!command) {
    return { command: "", output: "", exitCode: null, error: "Enter a command to run." };
  }

  const { output, exitCode } = await runShellCommand(command);
  await recordAudit({
    actor: user,
    action: "ops.shell",
    summary: `$ ${command.slice(0, 200)} (exit ${exitCode})${output ? `: ${output.slice(0, 120)}` : ""}`,
  });

  return { command, output, exitCode };
}