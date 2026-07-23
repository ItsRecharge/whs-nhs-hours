import { db } from "../db";

/** Events this organizer is linked to, newest first. */
export async function listEventsForOrganizer(organizerId: number) {
  const links = await db.organizerEvent.findMany({
    where: { organizerId },
    include: {
      event: {
        include: {
          timeslots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
        },
      },
    },
  });
  return links
    .map((l) => l.event)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function isOrganizerLinked(
  organizerId: number,
  eventId: number,
): Promise<boolean> {
  const link = await db.organizerEvent.findUnique({
    where: { organizerId_eventId: { organizerId, eventId } },
  });
  return Boolean(link);
}

/** Replaces the set of organizers linked to an event. */
export async function setEventOrganizers(
  eventId: number,
  organizerIds: number[],
): Promise<void> {
  await db.$transaction([
    db.organizerEvent.deleteMany({ where: { eventId } }),
    db.organizerEvent.createMany({
      data: organizerIds.map((organizerId) => ({ organizerId, eventId })),
    }),
  ]);
}

/** All organizer accounts with their linked events. */
export async function listOrganizers() {
  return db.user.findMany({
    where: { role: "organizer" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      emailVerifiedAt: true,
      deactivatedAt: true,
      createdAt: true,
      organizerEvents: {
        select: { event: { select: { id: true, title: true } } },
      },
    },
    orderBy: { firstName: "asc" },
  });
}
