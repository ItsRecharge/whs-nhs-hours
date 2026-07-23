import type { Event } from "@prisma/client";
import { db } from "../db";
import type { TimeslotInput } from "../validation";
import { promoteWaitlist } from "./slot-signup-service";

export interface CreateEventInput {
  title: string;
  description?: string;
  location?: string;
  slots: TimeslotInput[];
}

function eventData(input: CreateEventInput) {
  return {
    title: input.title,
    description: input.description ?? null,
    location: input.location ?? null,
    timeslots: {
      create: input.slots.map((s) => ({
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        hoursValue: s.hoursValue,
        quota: s.quota,
      })),
    },
  };
}

export async function createEvent(
  input: CreateEventInput,
  officerId: number,
): Promise<Event> {
  return db.event.create({
    data: {
      ...eventData(input),
      status: "active",
      createdById: officerId,
      approvedById: officerId,
    },
  });
}

export async function requestEvent(
  input: CreateEventInput,
  memberId: number,
): Promise<Event> {
  return db.event.create({
    data: {
      ...eventData(input),
      status: "pending_approval",
      createdById: memberId,
    },
  });
}

export async function approveRequest(
  eventId: number,
  officerId: number,
): Promise<Event | null> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "pending_approval") return null;
  return db.event.update({
    where: { id: eventId },
    data: { status: "active", approvedById: officerId },
  });
}

export async function denyRequest(eventId: number): Promise<Event | null> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event || event.status !== "pending_approval") return null;
  return db.event.update({
    where: { id: eventId },
    data: { status: "cancelled" },
  });
}

/**
 * Raises (or changes) a slot's quota and promotes FIFO waitlisters up to the new
 * capacity. Returns the userIds promoted so the caller can notify them.
 */
export async function updateSlotQuota(
  timeslotId: number,
  quota: number,
): Promise<number[]> {
  await db.timeslot.update({ where: { id: timeslotId }, data: { quota } });
  return promoteWaitlist(timeslotId);
}

export async function listEvents() {
  return db.event.findMany({
    include: {
      timeslots: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: { signups: { select: { status: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPendingRequests() {
  return db.event.findMany({
    where: { status: "pending_approval" },
    include: {
      createdBy: { select: { firstName: true, lastName: true } },
      timeslots: { orderBy: [{ date: "asc" }, { startTime: "asc" }] },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function getEventForEdit(eventId: number) {
  return db.event.findUnique({
    where: { id: eventId },
    include: {
      timeslots: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: { _count: { select: { signups: true } } },
      },
    },
  });
}

export async function updateEventMeta(
  eventId: number,
  meta: { title: string; description?: string; location?: string },
): Promise<void> {
  await db.event.update({
    where: { id: eventId },
    data: {
      title: meta.title,
      description: meta.description ?? null,
      location: meta.location ?? null,
    },
  });
}

/** Updates a slot's fields; if quota increased, promotes waitlisters. */
export async function updateTimeslot(
  timeslotId: number,
  data: TimeslotInput,
): Promise<number[]> {
  await db.timeslot.update({
    where: { id: timeslotId },
    data: {
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      hoursValue: data.hoursValue,
      quota: data.quota,
    },
  });
  return promoteWaitlist(timeslotId);
}

export async function addTimeslots(
  eventId: number,
  slots: TimeslotInput[],
): Promise<void> {
  if (slots.length === 0) return;
  await db.timeslot.createMany({
    data: slots.map((s) => ({
      eventId,
      date: s.date,
      startTime: s.startTime,
      endTime: s.endTime,
      hoursValue: s.hoursValue,
      quota: s.quota,
    })),
  });
}

/** Deletes a slot unless it's the event's last one. Returns whether it deleted. */
export async function deleteTimeslot(timeslotId: number): Promise<boolean> {
  const slot = await db.timeslot.findUnique({ where: { id: timeslotId } });
  if (!slot) return false;
  const count = await db.timeslot.count({ where: { eventId: slot.eventId } });
  if (count <= 1) return false;
  await db.timeslot.delete({ where: { id: timeslotId } });
  return true;
}

/** Cancels an event and returns the userIds who were signed up (for notifying). */
export async function cancelEvent(eventId: number): Promise<number[] | null> {
  const event = await db.event.findUnique({
    where: { id: eventId },
    include: { timeslots: { include: { signups: { select: { userId: true } } } } },
  });
  if (!event || event.status === "cancelled") return null;
  await db.event.update({ where: { id: eventId }, data: { status: "cancelled" } });
  const userIds = new Set<number>();
  for (const slot of event.timeslots) {
    for (const s of slot.signups) userIds.add(s.userId);
  }
  return [...userIds];
}

export async function deleteEvent(eventId: number): Promise<void> {
  await db.event.delete({ where: { id: eventId } });
}

/** Member cancels their own pending request. Returns the deleted event title. */
export async function cancelOwnRequest(
  eventId: number,
  memberId: number,
): Promise<string | null> {
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (
    !event ||
    event.createdById !== memberId ||
    event.status !== "pending_approval"
  ) {
    return null;
  }
  await db.event.delete({ where: { id: eventId } });
  return event.title;
}

/** Active events with per-slot fill counts and this member's own signup state. */
export async function listActiveEventsForMember(memberId: number) {
  return db.event.findMany({
    where: { status: "active" },
    include: {
      timeslots: {
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
        include: {
          signups: { select: { userId: true, status: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
