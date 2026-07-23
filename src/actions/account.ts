"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser, fullName } from "@/lib/current-user";
import {
  changeEmailSchema,
  changePasswordSchema,
  profileSchema,
} from "@/lib/validation";
import { hashPassword } from "@/lib/services/auth-service";
import { revokeAllUserSessions } from "@/lib/services/session-service";
import {
  consumeAuthToken,
  issueAuthToken,
} from "@/lib/services/token-service";
import { createSession } from "@/lib/session";
import { sendMail } from "@/lib/email/mailer";
import { emailChangeEmail } from "@/lib/email/templates";
import { getPublicBaseUrl } from "@/lib/services/chapter-service";
import type { Role } from "@/lib/constants";

export interface AccountFormState {
  error?: string;
  success?: string;
}

/** Updates the signed-in user's own name and graduation year. */
export async function updateProfileAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    graduationYear: formData.get("graduationYear") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  await db.user.update({
    where: { id: user.id },
    data: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      graduationYear: parsed.data.graduationYear ?? null,
    },
  });

  return { success: "Profile updated." };
}

/**
 * Changes the password for the signed-in user. Re-entering the current password
 * is the only confirmation needed (no email round-trip). All other sessions are
 * revoked; this device is re-issued a fresh session so it stays signed in.
 */
export async function changePasswordAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  await revokeAllUserSessions(user.id);
  await createSession({
    userId: user.id,
    role: user.role as Role,
    name: fullName(user),
  });

  return { success: "Password updated. Other devices have been signed out." };
}

/**
 * Requests an email change for the signed-in user, confirmed by the current
 * password. The new address only takes effect after the user clicks the
 * verification link sent to it; the current email stays active until then.
 */
export async function changeEmailAction(
  _prev: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const user = await requireUser();
  const parsed = changeEmailSchema.safeParse({
    newEmail: formData.get("newEmail"),
    currentPassword: formData.get("currentPassword"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!ok) return { error: "Current password is incorrect." };

  const newEmail = parsed.data.newEmail;
  if (newEmail === user.email) {
    return { error: "That's already your email address." };
  }
  const taken = await db.user.findUnique({ where: { email: newEmail } });
  if (taken) return { error: "That email is already in use." };

  // Stash the pending address and email a verification link to it.
  await db.user.update({ where: { id: user.id }, data: { pendingEmail: newEmail } });
  const token = await issueAuthToken(user.id, "email_change");
  try {
    await sendMail({
      to: newEmail,
      ...emailChangeEmail(user.firstName, token, await getPublicBaseUrl()),
    });
  } catch (err) {
    console.error("[email-change] verification email failed:", err);
  }

  return {
    success: `We've sent a verification link to ${newEmail}. Click it to finish the change — your current email stays active until then.`,
  };
}

/**
 * Completes a pending email change by consuming its token and swapping the
 * address. Returns whether it succeeded (and whether the address got taken in
 * the meantime).
 */
export async function verifyEmailChangeAction(
  token: string,
): Promise<{ ok: boolean; emailInUse?: boolean }> {
  const user = await consumeAuthToken(token, "email_change");
  if (!user || !user.pendingEmail) return { ok: false };

  try {
    await db.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerifiedAt: new Date(),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await db.user.update({ where: { id: user.id }, data: { pendingEmail: null } });
      return { ok: false, emailInUse: true };
    }
    throw err;
  }
  return { ok: true };
}
