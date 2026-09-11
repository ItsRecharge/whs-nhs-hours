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
import {
  grantAdmin,
  revokeAdmin,
  LastAdminError,
  NotAnOfficerError,
} from "@/lib/services/bootstrap-service";
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

/** Deactivate / reactivate an officer. Admins are protected until their role is removed. */
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
 * Grants the admin role to another active officer. Only an admin may do this,
 * confirmed with their own password. Any number of admins may exist.
 */
export async function grantAdminAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  if (!officer.isBootstrapOfficer) {
    await setFlash("danger", "Only an admin can add admins.");
    redirect(OFFICERS_PATH);
  }

  const targetId = Number(formData.get("targetId"));
  const password = String(formData.get("password") ?? "");

  if (!(await verifyPassword(officer.passwordHash, password))) {
    await setFlash("danger", "Password confirmation failed.");
    redirect(OFFICERS_PATH);
  }

  let target;
  try {
    target = await grantAdmin(targetId);
  } catch (err) {
    if (err instanceof NotAnOfficerError) {
      await setFlash("warning", "Pick an active officer to make an admin.");
      redirect(OFFICERS_PATH);
    }
    throw err;
  }

  await recordAudit({
    actor: officer,
    action: "admin.grant",
    summary: `Made ${fullName(target)} an admin`,
    targetType: "user",
    targetId: target.id,
  });
  await setFlash("success", `${target.firstName} is now an admin.`);
  revalidatePath(OFFICERS_PATH);
  redirect(OFFICERS_PATH);
}

/**
 * Removes the admin role from another admin. Only an admin may do this; you
 * can't remove your own admin role, and the last admin can never be removed.
 */
export async function revokeAdminAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  if (!officer.isBootstrapOfficer) {
    await setFlash("danger", "Only an admin can remove admins.");
    redirect(OFFICERS_PATH);
  }

  const targetId = Number(formData.get("userId"));
  if (targetId === officer.id) {
    await setFlash("warning", "You can't remove your own admin role. Ask another admin.");
    redirect(OFFICERS_PATH);
  }

  let target;
  try {
    target = await revokeAdmin(targetId);
  } catch (err) {
    if (err instanceof LastAdminError) {
      await setFlash("warning", err.message);
      redirect(OFFICERS_PATH);
    }
    if (err instanceof NotAnOfficerError) {
      await setFlash("danger", "That account no longer exists.");
      redirect(OFFICERS_PATH);
    }
    throw err;
  }

  await recordAudit({
    actor: officer,
    action: "admin.revoke",
    summary: `Removed ${fullName(target)}'s admin role`,
    targetType: "user",
    targetId: target.id,
  });
  await setFlash("info", `${target.firstName} is no longer an admin.`);
  revalidatePath(OFFICERS_PATH);
  redirect(OFFICERS_PATH);
}
