"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { issueAuthToken } from "@/lib/services/token-service";
import {
  BootstrapOfficerProtectionError,
  setMemberActive,
} from "@/lib/services/roster-service";
import { getPublicBaseUrl } from "@/lib/services/chapter-service";
import { verifyPassword } from "@/lib/services/auth-service";
import { recordAudit } from "@/lib/services/audit-service";
import { sendMail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";
import { setFlash } from "@/lib/flash";

const OFFICERS_PATH = "/officer/officers";
const RESET_LINK_COOKIE = "nhs_last_reset_link";

async function targetName(userId: number): Promise<string> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { firstName: true, lastName: true },
  });
  return u ? fullName(u) : `user #${userId}`;
}

/**
 * Generates a one-time password-reset link for another user and reveals it via a
 * short-lived cookie (the master admin resets their own password from Settings).
 */
export async function sendPasswordResetForUserAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));

  if (userId === officer.id) {
    await setFlash("info", "Reset your own password from Settings.");
    redirect(OFFICERS_PATH);
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true, email: true },
  });
  if (!target) {
    await setFlash("danger", "That account no longer exists.");
    redirect(OFFICERS_PATH);
  }

  const token = await issueAuthToken(userId, "password_reset");
  const link = `${await getPublicBaseUrl()}/reset-password?token=${token}`;

  (await cookies()).set(RESET_LINK_COOKIE, link, {
    path: OFFICERS_PATH,
    maxAge: 300,
    sameSite: "lax",
  });

  // Optionally email the link straight to the person.
  const emailIt = formData.get("emailIt") != null;
  let emailed = false;
  if (emailIt) {
    try {
      await sendMail({
        to: target.email,
        ...passwordResetEmail(target.firstName, token, await getPublicBaseUrl()),
      });
      emailed = true;
    } catch (err) {
      console.error("[officer-reset] email failed:", err);
    }
  }

  await recordAudit({
    actor: officer,
    action: "officer.passwordResetLink",
    summary: `Generated a password reset link for ${fullName(target)}${emailed ? " and emailed it" : ""}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash(
    "success",
    emailIt
      ? emailed
        ? `Reset link generated and emailed to ${target.firstName}. Copy below too.`
        : `Reset link generated for ${target.firstName} (email failed — copy it below).`
      : `Reset link generated for ${target.firstName}. Copy it below.`,
  );
  revalidatePath(OFFICERS_PATH);
  redirect(OFFICERS_PATH);
}

/** Deactivate / reactivate an officer. Bootstrap officer is protected for year one. */
export async function setOfficerActiveAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const userId = Number(formData.get("userId"));
  const active = formData.get("active") === "true";

  if (userId === officer.id) {
    await setFlash("warning", "You can't deactivate your own account.");
    redirect(OFFICERS_PATH);
  }

  try {
    await setMemberActive(userId, active);
  } catch (err) {
    if (err instanceof BootstrapOfficerProtectionError) {
      await setFlash("warning", err.message);
      redirect(OFFICERS_PATH);
    }
    throw err;
  }

  await recordAudit({
    actor: officer,
    action: active ? "officer.reactivate" : "officer.deactivate",
    summary: `${active ? "Reactivated" : "Deactivated"} ${await targetName(userId)}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("info", active ? "Officer reactivated." : "Officer deactivated.");
  revalidatePath(OFFICERS_PATH);
  redirect(OFFICERS_PATH);
}

/**
 * Hands the bootstrap (master admin) role to another officer. Only the current
 * bootstrap officer may do this, confirmed with their password. Exactly one
 * bootstrap officer exists at a time.
 */
export async function transferBootstrapAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  if (!officer.isBootstrapOfficer) {
    await setFlash("danger", "Only the admin can transfer the role.");
    redirect(OFFICERS_PATH);
  }

  const targetId = Number(formData.get("targetId"));
  const password = String(formData.get("password") ?? "");

  if (!(await verifyPassword(officer.passwordHash, password))) {
    await setFlash("danger", "Password confirmation failed.");
    redirect(OFFICERS_PATH);
  }

  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "officer" || target.deactivatedAt || target.id === officer.id) {
    await setFlash("warning", "Pick an active officer to receive the admin role.");
    redirect(OFFICERS_PATH);
  }

  await db.$transaction([
    db.user.update({ where: { id: officer.id }, data: { isBootstrapOfficer: false } }),
    db.user.update({ where: { id: target.id }, data: { isBootstrapOfficer: true } }),
  ]);

  await recordAudit({
    actor: officer,
    action: "bootstrap.transfer",
    summary: `Transferred the admin role to ${fullName(target)}`,
    targetType: "user",
    targetId: target.id,
  });
  await setFlash("success", `${target.firstName} is now the admin.`);
  revalidatePath(OFFICERS_PATH);
  redirect(OFFICERS_PATH);
}
