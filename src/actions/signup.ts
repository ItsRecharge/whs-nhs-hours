"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { signupSchema } from "@/lib/validation";
import { signupWithInvite } from "@/lib/services/signup-service";
import { consumeAuthToken, issueAuthToken } from "@/lib/services/token-service";
import { sendMail } from "@/lib/email/mailer";
import { verificationEmail } from "@/lib/email/templates";
import { getPublicBaseUrl } from "@/lib/services/chapter-service";
import { setFlash } from "@/lib/flash";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";

export interface SignupFormState {
  error?: string;
}

export async function signupAction(
  _prev: SignupFormState,
  formData: FormData,
): Promise<SignupFormState> {
  const parsed = signupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName") ?? "",
    email: formData.get("email"),
    password: formData.get("password"),
    graduationYear: formData.get("graduationYear") ?? "",
    inviteToken: formData.get("inviteToken"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const ip = await requestIp();
  if (!rateLimit(`signup:${ip}`, 5, 60 * 60 * 1000)) {
    return { error: "Too many sign-up attempts. Please try again later." };
  }

  const { firstName, lastName, email, password, graduationYear, inviteToken } =
    parsed.data;
  const result = await signupWithInvite({
    firstName,
    lastName,
    email,
    password,
    graduationYear,
    rawInviteToken: inviteToken,
  });

  if (!result.ok) {
    switch (result.reason) {
      case "email_taken":
        return { error: "An account with that email already exists. Try logging in." };
      case "invite_exhausted":
        return { error: "This invite link has reached its usage limit." };
      default:
        return { error: "This invite link is invalid or has expired." };
    }
  }

  // Transactional verification email — sent inline; signup still succeeds if it
  // fails (the user can resend from the login page).
  try {
    const content = verificationEmail(
      result.firstName,
      result.verificationToken,
      await getPublicBaseUrl(),
    );
    await sendMail({ to: result.email, ...content });
  } catch (err) {
    console.error("[signup] verification email failed:", err);
  }

  await setFlash(
    "success",
    "Account created! Check your email for a verification link before logging in.",
  );
  redirect("/login");
}

export async function resendVerificationAction(formData: FormData): Promise<void> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) redirect("/login");

  if (!rateLimit(`resend:${email}`, 3, 60 * 60 * 1000)) {
    await setFlash("warning", "Please wait before requesting another verification email.");
    redirect("/login");
  }

  const user = await db.user.findUnique({ where: { email } });
  // Always respond the same way (no account enumeration).
  if (user && !user.emailVerifiedAt) {
    try {
      const token = await issueAuthToken(user.id, "email_verification");
      await sendMail({
        to: user.email,
        ...verificationEmail(user.firstName, token, await getPublicBaseUrl()),
      });
    } catch (err) {
      console.error("[resend] verification email failed:", err);
    }
  }
  await setFlash("info", "If that account needs verification, a new link is on its way.");
  redirect("/login");
}

export async function verifyEmailAction(token: string): Promise<boolean> {
  const user = await consumeAuthToken(token, "email_verification");
  if (!user) return false;
  await db.user.update({
    where: { id: user.id },
    data: { emailVerifiedAt: new Date() },
  });
  return true;
}
