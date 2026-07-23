"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { adminProfileSchema, passwordSchema } from "@/lib/validation";
import { hashPassword } from "@/lib/services/auth-service";
import { revokeAllUserSessions } from "@/lib/services/session-service";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

function memberPath(id: number) {
  return `/officer/members/${id}`;
}

/** Asserts the caller is the bootstrap officer; redirects with a flash otherwise. */
async function requireBootstrap(redirectTo: string) {
  const officer = await requireUser("officer");
  if (!officer.isBootstrapOfficer) {
    await setFlash("danger", "Only the bootstrap officer can edit user data directly.");
    redirect(redirectTo);
  }
  return officer;
}

/** Bootstrap-only: edit a user's name, email, and graduation year directly. */
export async function bootstrapEditProfileAction(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  const officer = await requireBootstrap(memberPath(userId));

  const parsed = adminProfileSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email"),
    graduationYear: formData.get("graduationYear") ?? "",
  });
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect(memberPath(userId));
  }

  const current = await db.user.findUnique({ where: { id: userId } });
  if (!current) {
    await setFlash("danger", "That account no longer exists.");
    redirect(memberPath(userId));
  }

  const emailChanged = parsed.data.email !== current.email;
  try {
    await db.user.update({
      where: { id: userId },
      data: {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        graduationYear: parsed.data.graduationYear ?? null,
        email: parsed.data.email,
        // A direct admin email change takes effect immediately, no link needed.
        ...(emailChanged ? { pendingEmail: null, emailVerifiedAt: new Date() } : {}),
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      await setFlash("danger", "That email is already in use.");
      redirect(memberPath(userId));
    }
    throw err;
  }

  // Changing the sign-in email invalidates existing sessions.
  if (emailChanged) await revokeAllUserSessions(userId);

  await recordAudit({
    actor: officer,
    action: "admin.user.editProfile",
    summary: `Edited ${fullName(parsed.data)}'s profile${emailChanged ? ` (email → ${parsed.data.email})` : ""}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("success", "Profile updated.");
  revalidatePath(memberPath(userId));
  redirect(memberPath(userId));
}

/** Bootstrap-only: set a user's password directly and log them out everywhere. */
export async function bootstrapSetPasswordAction(formData: FormData): Promise<void> {
  const userId = Number(formData.get("userId"));
  const officer = await requireBootstrap(memberPath(userId));

  const parsed = passwordSchema.safeParse(formData.get("password"));
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect(memberPath(userId));
  }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!target) {
    await setFlash("danger", "That account no longer exists.");
    redirect(memberPath(userId));
  }

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data) },
  });
  await revokeAllUserSessions(userId);

  await recordAudit({
    actor: officer,
    action: "admin.user.setPassword",
    summary: `Set a new password for ${fullName(target)}`,
    targetType: "user",
    targetId: userId,
  });
  await setFlash("success", `Password updated for ${target.firstName}.`);
  redirect(memberPath(userId));
}
