"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation";
import { consumeAuthToken, issueAuthToken } from "@/lib/services/token-service";
import { revokeAllUserSessions } from "@/lib/services/session-service";
import { hashPassword } from "@/lib/services/auth-service";
import { sendMail } from "@/lib/email/mailer";
import { passwordResetEmail } from "@/lib/email/templates";
import { getPublicBaseUrl } from "@/lib/services/chapter-service";
import { setFlash } from "@/lib/flash";
import { rateLimit } from "@/lib/rate-limit";

export interface ResetFormState {
  error?: string;
}

export async function forgotPasswordAction(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email } = parsed.data;

  if (!rateLimit(`forgot:${email}`, 3, 60 * 60 * 1000)) {
    return { error: "Too many requests. Please try again later." };
  }

  const user = await db.user.findUnique({ where: { email } });
  // No account enumeration — always succeed identically.
  if (user) {
    try {
      const token = await issueAuthToken(user.id, "password_reset");
      await sendMail({
        to: user.email,
        ...passwordResetEmail(user.firstName, token, await getPublicBaseUrl()),
      });
    } catch (err) {
      console.error("[forgot-password] email failed:", err);
    }
  }

  await setFlash("info", "If that email is registered, a reset link has been sent.");
  redirect("/login");
}

export async function resetPasswordAction(
  _prev: ResetFormState,
  formData: FormData,
): Promise<ResetFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const user = await consumeAuthToken(parsed.data.token, "password_reset");
  if (!user) {
    return { error: "This reset link is invalid or has expired. Request a new one." };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await hashPassword(parsed.data.password),
      // A successful reset also confirms ownership of the email.
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
  });

  // Invalidate every existing session so a stolen/old cookie can't survive a reset.
  await revokeAllUserSessions(user.id);

  await setFlash("success", "Password updated. You can now log in.");
  redirect("/login");
}
