"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser } from "@/lib/current-user";
import { hourReportSchema } from "@/lib/validation";
import {
  createReport,
  reviewReport,
} from "@/lib/services/hour-report-service";
import { notifyHourReportDecision } from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { fullName } from "@/lib/current-user";
import { setFlash } from "@/lib/flash";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";
import { savePhotoUpload } from "@/lib/uploads";

export async function reportHoursAction(formData: FormData): Promise<void> {
  const member = await requireUser("member");

  const parsed = hourReportSchema.safeParse({
    description: formData.get("description"),
    notes: formData.get("notes") || undefined,
    date: formData.get("date"),
    hoursRequested: formData.get("hoursRequested"),
    category: formData.get("category"),
    origin: formData.get("origin"),
  });
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect("/member/report-hours");
  }

  // Proof rules: outside reports need a photo (message optional); inside
  // reports need a photo OR a message — at least one.
  const photo = formData.get("photo");
  const hasPhoto = photo instanceof File && photo.size > 0;
  const hasMessage = Boolean(parsed.data.notes?.trim());
  if (parsed.data.origin === "outside" && !hasPhoto) {
    await setFlash(
      "danger",
      "Outside hours need a proof photo (a portal screenshot, a photo from the event, etc.).",
    );
    redirect("/member/report-hours");
  }
  if (parsed.data.origin === "inside" && !hasPhoto && !hasMessage) {
    await setFlash(
      "danger",
      "Inside reports need a photo or a message for the reviewing officer — add at least one.",
    );
    redirect("/member/report-hours");
  }

  const ip = await requestIp();
  if (!rateLimit(`report:${ip}:${member.id}`, 10, 60 * 60 * 1000)) {
    await setFlash("warning", "Too many submissions. Please try again later.");
    redirect("/member/report-hours");
  }

  let photoPath: string | null = null;
  if (hasPhoto) {
    const saved = await savePhotoUpload(photo);
    if (!saved.ok) {
      await setFlash("danger", saved.error);
      redirect("/member/report-hours");
    }
    photoPath = saved.relPath;
  }

  await createReport({ userId: member.id, ...parsed.data, photoPath });
  await setFlash("success", "Hours submitted for officer approval.");
  revalidatePath("/member/report-hours");
  redirect("/member/report-hours");
}

async function reviewAction(formData: FormData, approve: boolean): Promise<void> {
  const officer = await requireUser("officer");
  const reportId = Number(formData.get("reportId"));

  const report = await reviewReport(reportId, approve, officer.id);
  if (report) {
    const reviewed = report;
    after(async () => {
      await notifyHourReportDecision(
        reviewed.userId,
        reviewed.description,
        reviewed.hoursRequested,
        approve,
      );
      // Approved hours now count toward totals — mirror them to the sheet.
      if (approve) {
        await syncSheetsAfterChange([
          {
            memberName: fullName(reviewed.user),
            email: reviewed.user.email,
            hours: reviewed.hoursRequested,
            source: `Report: ${reviewed.description}`,
            date: reviewed.date,
            recordedBy: fullName(officer),
          },
        ]);
      }
    });
    await recordAudit({
      actor: officer,
      action: approve ? "report.approve" : "report.deny",
      summary: `${approve ? "Approved" : "Denied"} ${report.hoursRequested} hrs for ${report.user.firstName} ("${report.description}")`,
      targetType: "report",
      targetId: report.id,
    });
    await setFlash(
      approve ? "success" : "info",
      approve
        ? `Approved ${report.hoursRequested} hrs for ${report.user.firstName}.`
        : "Hour report denied.",
    );
  } else {
    await setFlash("warning", "That report could not be reviewed.");
  }

  revalidatePath("/officer/requests");
  redirect("/officer/requests");
}

export async function approveReportAction(formData: FormData): Promise<void> {
  await reviewAction(formData, true);
}

export async function denyReportAction(formData: FormData): Promise<void> {
  await reviewAction(formData, false);
}
