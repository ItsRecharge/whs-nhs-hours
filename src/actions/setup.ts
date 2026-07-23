"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { setupSchema } from "@/lib/validation";
import { isFirstRun } from "@/lib/services/setup-service";
import { hashPassword } from "@/lib/services/auth-service";
import { updateChapterSettings } from "@/lib/services/chapter-service";
import { updateMailConfig } from "@/lib/services/integration-service";
import { createSession } from "@/lib/session";
import { fullName } from "@/lib/current-user";
import { setFlash } from "@/lib/flash";
import type { Role } from "@/lib/constants";

export interface SetupFormState {
  error?: string;
}

/**
 * Completes first-run setup: creates the chapter's first officer, saves chapter
 * settings, optionally configures email, and logs the new officer in. Re-checks
 * isFirstRun() server-side so the wizard can't be replayed once an officer
 * exists (the page guard alone can't stop a racing double-submit).
 */
export async function completeSetupAction(
  _prev: SetupFormState,
  formData: FormData,
): Promise<SetupFormState> {
  if (!(await isFirstRun())) {
    return { error: "Setup has already been completed." };
  }

  const parsed = setupSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    password: formData.get("password"),
    chapterName: formData.get("chapterName"),
    totalHoursGoal: formData.get("totalHoursGoal"),
    gmailUser: formData.get("gmailUser"),
    gmailAppPassword: formData.get("gmailAppPassword"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const data = parsed.data;

  const existing = await db.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return { error: "An account with that email already exists." };
  }

  const officer = await db.user.create({
    data: {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: "officer",
      isBootstrapOfficer: true,
      emailVerifiedAt: new Date(), // bootstrap officer skips email verification
    },
  });

  await updateChapterSettings({
    chapterName: data.chapterName,
    totalHoursGoal: data.totalHoursGoal,
    outsideHoursCap: 14,
    schoolYearEndMonth: 6,
    schoolYearEndDay: 30,
    publicUrl: null,
  });

  if (data.gmailUser && data.gmailAppPassword) {
    await updateMailConfig({
      user: data.gmailUser,
      appPassword: data.gmailAppPassword,
    });
  }

  await createSession({
    userId: officer.id,
    role: officer.role as Role,
    name: fullName(officer),
  });

  await setFlash("success", "Setup complete — welcome to your chapter!");
  redirect("/officer/dashboard");
}
