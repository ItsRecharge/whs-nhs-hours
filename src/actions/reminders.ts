"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { notifyHoursSummary } from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { setFlash } from "@/lib/flash";

/** Officer button: email every active member their hours summary / reminder. */
export async function sendHoursSummaryAction(): Promise<void> {
  const officer = await requireUser("officer");

  const count = await db.user.count({
    where: { role: "member", emailVerifiedAt: { not: null }, deactivatedAt: null },
  });

  if (count === 0) {
    await setFlash("info", "No verified members to email.");
    redirect("/officer/dashboard");
  }

  after(() => notifyHoursSummary());
  await recordAudit({
    actor: officer,
    action: "members.hoursSummary",
    summary: `Emailed an hours summary/reminder to ${count} members`,
  });

  await setFlash(
    "success",
    `Hours summary is being emailed to ${count} member${count === 1 ? "" : "s"}.`,
  );
  revalidatePath("/officer/dashboard");
  redirect("/officer/dashboard");
}
