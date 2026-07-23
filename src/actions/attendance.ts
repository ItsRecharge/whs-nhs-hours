"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser, fullName } from "@/lib/current-user";
import { markSlotAttendance } from "@/lib/services/attendance-service";
import { isOrganizerLinked } from "@/lib/services/organizer-service";
import { db } from "@/lib/db";
import { notifyHoursCredited } from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { setFlash } from "@/lib/flash";

export async function markAttendanceAction(formData: FormData): Promise<void> {
  // Officers can mark any event; organizer accounts only events they're linked to.
  const actor = await requireUser();
  const timeslotId = Number(formData.get("timeslotId"));
  const eventId = Number(formData.get("eventId"));
  const isOrganizer = actor.role === "organizer";

  const backPath = isOrganizer
    ? `/organizer/events/${eventId}/attendance`
    : `/officer/events/${eventId}/attendance`;
  const listPath = isOrganizer ? "/organizer/dashboard" : "/officer/events";

  if (actor.role !== "officer" && !isOrganizer) {
    redirect("/member/dashboard");
  }
  if (isOrganizer) {
    const slot = await db.timeslot.findUnique({
      where: { id: timeslotId },
      select: { eventId: true },
    });
    if (!slot || !(await isOrganizerLinked(actor.id, slot.eventId))) {
      await setFlash("warning", "You aren't linked to that event.");
      redirect(listPath);
    }
  }

  // Checkboxes named "present" carry the present user IDs for this slot.
  const presentUserIds = formData
    .getAll("present")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  const result = await markSlotAttendance(timeslotId, presentUserIds, actor.id);
  if (!result) {
    await setFlash("warning", "Timeslot not found.");
    redirect(listPath);
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
            recordedBy: fullName(actor),
          };
        }),
      );
    });
  }

  await recordAudit({
    actor: actor,
    action: "attendance.mark",
    summary: `Recorded attendance for "${result.eventTitle}" (${result.credited.length} credited)`,
    targetType: "timeslot",
    targetId: timeslotId,
  });

  await setFlash(
    "success",
    `Attendance saved. ${result.credited.length} member(s) credited.`,
  );
  revalidatePath(backPath);
  redirect(backPath);
}
