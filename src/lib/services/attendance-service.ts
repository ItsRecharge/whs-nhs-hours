import { db } from "../db";

export interface AttendanceCredit {
  userId: number;
  hours: number;
  eventTitle: string;
}

/**
 * Marks attendance for a single timeslot and credits hours, in one transaction:
 *   - sets attended/markedById on the slot's signups (present vs not)
 *   - stamps the slot's completedAt
 *   - flips the parent event to "completed" once every slot is completed
 * Returns the members newly credited (flipped not-attended -> attended) so the
 * caller can notify them and back the hours up to Sheets.
 */
export async function markSlotAttendance(
  timeslotId: number,
  presentUserIds: number[],
  officerId: number,
): Promise<{ credited: AttendanceCredit[]; eventTitle: string } | null> {
  const timeslot = await db.timeslot.findUnique({
    where: { id: timeslotId },
    include: { signups: true, event: { select: { id: true, title: true } } },
  });
  if (!timeslot) return null;

  const present = new Set(presentUserIds);
  const officerEventId = timeslot.event.id;
  const newlyCredited = timeslot.signups.filter(
    (s) => present.has(s.userId) && !s.attended,
  );

  await db.$transaction(async (tx) => {
    await Promise.all(
      timeslot.signups.map((s) =>
        tx.eventSignup.update({
          where: { id: s.id },
          data: {
            attended: present.has(s.userId),
            markedById: present.has(s.userId) ? officerId : null,
          },
        }),
      ),
    );
    await tx.timeslot.update({
      where: { id: timeslotId },
      data: { completedAt: new Date() },
    });

    const remaining = await tx.timeslot.count({
      where: { eventId: officerEventId, completedAt: null },
    });
    if (remaining === 0) {
      await tx.event.update({
        where: { id: officerEventId },
        data: { status: "completed" },
      });
    }
  });

  return {
    eventTitle: timeslot.event.title,
    credited: newlyCredited.map((s) => ({
      userId: s.userId,
      hours: timeslot.hoursValue,
      eventTitle: timeslot.event.title,
    })),
  };
}

/** Event with its timeslots and each slot's signups (for the attendance page). */
export async function getEventForAttendance(eventId: number) {
  return db.event.findUnique({
    where: { id: eventId },
    include: {
      timeslots: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          signups: {
            include: { user: { select: { firstName: true, lastName: true } } },
            orderBy: [{ status: "asc" }, { signedUpAt: "asc" }],
          },
        },
      },
    },
  });
}
