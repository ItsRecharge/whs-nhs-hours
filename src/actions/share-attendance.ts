"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/lib/db";
import { fullName } from "@/lib/current-user";
import { validateShareLink } from "@/lib/services/share-service";
import { markSlotAttendance } from "@/lib/services/attendance-service";
import { notifyHoursCredited } from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";

/**
 * Attendance marking from a public share link — no session. The token is
 * re-validated server-side and the slot must belong to the link's event.
 * Credits are attributed to the officer who created the link; the audit entry
 * carries the organizer's name.
 */
export async function markShareAttendanceAction(formData: FormData): Promise<void> {
  const rawToken = String(formData.get("token") ?? "");
  const sharePath = `/share/attendance/${rawToken}`;

  const ip = await requestIp();
  if (!rateLimit(`share-attendance:${ip}`, 30, 60 * 60 * 1000)) {
    redirect(sharePath);
  }

  const link = await validateShareLink(rawToken, "attendance");
  if (!link || !link.eventId) redirect("/share/expired");

  const timeslotId = Number(formData.get("timeslotId"));
  const timeslot = await db.timeslot.findUnique({
    where: { id: timeslotId },
    select: { eventId: true },
  });
  if (!timeslot || timeslot.eventId !== link.eventId) redirect(sharePath);

  const presentUserIds = formData
    .getAll("present")
    .map((v) => Number(v))
    .filter((n) => Number.isInteger(n));

  const result = await markSlotAttendance(timeslotId, presentUserIds, link.createdById);
  if (!result) redirect(sharePath);

  if (result.credited.length > 0) {
    const credited = result.credited;
    const organizerName = link.organizerName;
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
            recordedBy: `Organizer: ${organizerName}`,
            category: c.eventCategory,
            origin: "inside",
          };
        }),
      );
    });
  }

  await recordAudit({
    actor: { id: link.createdById, firstName: "Organizer:", lastName: link.organizerName },
    action: "attendance.mark",
    summary: `Recorded attendance for "${result.eventTitle}" via share link: ${link.organizerName} (${result.credited.length} credited)`,
    targetType: "timeslot",
    targetId: timeslotId,
  });

  revalidatePath(sharePath);
  redirect(sharePath);
}
