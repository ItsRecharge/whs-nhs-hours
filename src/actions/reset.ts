"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { requireUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { runYearEndReset, resetPhrase } from "@/lib/services/reset-service";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { setFlash } from "@/lib/flash";

export async function yearEndResetAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");

  const password = String(formData.get("password") ?? "");
  const confirmPhrase = String(formData.get("confirmPhrase") ?? "").trim();
  const acknowledged = formData.get("acknowledge") === "on";

  if (!acknowledged) {
    await setFlash("danger", "Please tick the acknowledgement box.");
    redirect("/officer/admin");
  }

  const passwordOk = await bcrypt.compare(password, officer.passwordHash);
  if (!passwordOk) {
    await setFlash("danger", "Incorrect password — reset aborted.");
    redirect("/officer/admin");
  }

  // Re-count server-side so a stale phrase from the page can't bypass the gate.
  const memberCount = await db.user.count({ where: { role: "member" } });
  if (confirmPhrase !== resetPhrase(memberCount)) {
    await setFlash(
      "danger",
      `Confirmation phrase didn't match. Type exactly: ${resetPhrase(memberCount)}`,
    );
    redirect("/officer/admin");
  }

  const summary = await runYearEndReset();
  // Roster is now empty — push the cleared state to the sheet.
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "chapter.reset",
    summary: `Year-end reset: removed ${summary.members} members, ${summary.events} events, ${summary.signups} signups, ${summary.reports} reports, ${summary.invites} invites`,
  });

  await setFlash(
    "success",
    `Year-end reset complete. Removed ${summary.members} members and the year's activity.`,
  );
  revalidatePath("/officer/dashboard");
  redirect("/officer/dashboard");
}
