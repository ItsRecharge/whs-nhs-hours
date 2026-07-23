"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser, fullName } from "@/lib/current-user";
import { markSlotAttendance } from "@/lib/services/attendance-service";
import { db } from "@/lib/db";
import { notifyHoursCredited } from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { setFlash } from "@/lib/flash";

export async function markAttendanceAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const timeslotId = Number(formData.get("timeslotId"));
  const eventId = Number(formData.get("eventId"));

  // Checkboxes named "present" carry the present user IDs for this slot.
  const presentUserIds = formData
    .getAll("present")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  const result = await markSlotAttendance(timeslotId, presentUserIds, officer.id);
  if (!result) {
    await setFlash("warning", "Timeslot not found.");
    redirect("/officer/events");
  }

  if (result.credited.length > 0) {
    const credited = result.credited;
    after(async () => {
      await notifyHoursCredited(credited);

      const users = await db.user.findMany({
        where: { id: { in: credited.map((c) => c.userId) } },
        select: { id: true, firstName: true, lastName: true, email: true },
      });
      const byId = new Map(users.map((u) => [u.id, u]));
      await syncSheetsAfterChange(
        credited.map((c) => {
          const u = byId.get(c.userId);
          return {
            memberName: u ? fullName(u) : `User ${c.userId}`,
            email: u?.email,
            hours: c.hours,
            source: `Event: ${c.eventTitle}`,
            date: new Date(),
            recordedBy: fullName(officer),
          };
        }),
      );
    });
  }

  await recordAudit({
    actor: officer,
    action: "attendance.mark",
    summary: `Recorded attendance for "${result.eventTitle}" (${result.credited.length} credited)`,
    targetType: "timeslot",
    targetId: timeslotId,
  });

  await setFlash(
    "success",
    `Attendance saved. ${result.credited.length} member(s) credited.`,
  );
  revalidatePath(`/officer/events/${eventId}/attendance`);
  redirect(`/officer/events/${eventId}/attendance`);
}
