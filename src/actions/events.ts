"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { requireUser, fullName } from "@/lib/current-user";
import { db } from "@/lib/db";
import { eventSchema, eventRequestSchema, timeslotSchema } from "@/lib/validation";
import {
  addTimeslots,
  approveRequest,
  cancelEvent,
  cancelOwnRequest,
  createEvent,
  deleteEvent,
  deleteTimeslot,
  denyRequest,
  requestEvent,
  updateEventMeta,
  updateTimeslot,
} from "@/lib/services/event-service";
import {
  notifyEventCancelled,
  notifyEventPosted,
  notifyNewRequest,
  notifyRequestDecision,
  notifyWaitlistPromoted,
} from "@/lib/email/notify";
import { recordAudit } from "@/lib/services/audit-service";
import { syncSheetsAfterChange } from "@/lib/services/sheet-sync-service";
import { setFlash } from "@/lib/flash";
import type { z } from "zod";

/** Collects the dynamic slot rows (parallel arrays) into objects for zod. */
function collectSlots(formData: FormData) {
  const dates = formData.getAll("slotDate");
  const starts = formData.getAll("slotStart");
  const ends = formData.getAll("slotEnd");
  const hours = formData.getAll("slotHours");
  const quotas = formData.getAll("slotQuota");
  return dates.map((date, i) => ({
    date: String(date),
    startTime: String(starts[i] ?? ""),
    endTime: String(ends[i] ?? ""),
    hoursValue: String(hours[i] ?? ""),
    quota: String(quotas[i] ?? ""),
  }));
}

function parseEvent<S extends typeof eventSchema | typeof eventRequestSchema>(
  formData: FormData,
  schema: S,
): z.SafeParseReturnType<unknown, z.infer<S>> {
  return schema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    location: formData.get("location") || undefined,
    slots: collectSlots(formData),
  }) as z.SafeParseReturnType<unknown, z.infer<S>>;
}

async function eventSlots(eventId: number) {
  return db.timeslot.findMany({
    where: { eventId },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    select: { date: true, startTime: true, endTime: true },
  });
}

export async function createEventAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const parsed = parseEvent(formData, eventSchema);
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect("/officer/events");
  }

  const event = await createEvent(parsed.data, officer.id);
  const slots = await eventSlots(event.id);
  after(() => notifyEventPosted({ title: event.title, slots }));
  await recordAudit({
    actor: officer,
    action: "event.create",
    summary: `Created event "${event.title}"`,
    targetType: "event",
    targetId: event.id,
  });

  await setFlash("success", `Event "${event.title}" created and members notified.`);
  revalidatePath("/officer/events");
  redirect("/officer/events");
}

export async function requestEventAction(formData: FormData): Promise<void> {
  const member = await requireUser("member");
  const parsed = parseEvent(formData, eventRequestSchema);
  if (!parsed.success) {
    await setFlash("danger", parsed.error.issues[0].message);
    redirect("/member/request-event");
  }

  const event = await requestEvent(parsed.data, member.id);
  after(() => notifyNewRequest(event.title, fullName(member)));

  await setFlash("success", "Your event request was submitted for officer approval.");
  revalidatePath("/member/dashboard");
  redirect("/member/dashboard");
}

export async function approveRequestAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));

  const event = await approveRequest(eventId, officer.id);
  if (event) {
    const requesterId = event.createdById;
    const slots = await eventSlots(event.id);
    after(async () => {
      await notifyRequestDecision(requesterId, event.title, true);
      await notifyEventPosted({ title: event.title, slots });
    });
    await recordAudit({
      actor: officer,
      action: "event.approve",
      summary: `Approved request "${event.title}"`,
      targetType: "event",
      targetId: event.id,
    });
    await setFlash("success", `Approved "${event.title}". Members have been notified.`);
  } else {
    await setFlash("warning", "That request could not be approved.");
  }

  revalidatePath("/officer/requests");
  redirect("/officer/requests");
}

export async function denyRequestAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));

  const event = await denyRequest(eventId);
  if (event) {
    const requesterId = event.createdById;
    after(() => notifyRequestDecision(requesterId, event.title, false));
    await recordAudit({
      actor: officer,
      action: "event.deny",
      summary: `Denied request "${event.title}"`,
      targetType: "event",
      targetId: event.id,
    });
    await setFlash("info", `Denied "${event.title}".`);
  } else {
    await setFlash("warning", "That request could not be denied.");
  }

  revalidatePath("/officer/requests");
  redirect("/officer/requests");
}

/** Validates a single raw slot row; returns parsed data or an error message. */
function parseSlot(raw: {
  date: unknown;
  startTime: unknown;
  endTime: unknown;
  hoursValue: unknown;
  quota: unknown;
}) {
  return timeslotSchema.safeParse({
    date: String(raw.date ?? ""),
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    hoursValue: String(raw.hoursValue ?? ""),
    quota: String(raw.quota ?? ""),
  });
}

export async function editEventAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));
  const editPath = `/officer/events/${eventId}/edit`;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) {
    await setFlash("danger", "Title is required.");
    redirect(editPath);
  }

  // Existing slots (parallel arrays), with a remove-checkbox set.
  const ids = formData.getAll("existingSlotId");
  const eDate = formData.getAll("existDate");
  const eStart = formData.getAll("existStart");
  const eEnd = formData.getAll("existEnd");
  const eHours = formData.getAll("existHours");
  const eQuota = formData.getAll("existQuota");
  const removeIds = new Set(formData.getAll("removeSlotId").map((v) => Number(v)));

  const keptIds = ids.map(Number).filter((id) => !removeIds.has(id));

  // New slots from the SlotRows component.
  const newDates = formData.getAll("slotDate");
  const newSlots = newDates.map((d, i) => ({
    date: d,
    startTime: formData.getAll("slotStart")[i],
    endTime: formData.getAll("slotEnd")[i],
    hoursValue: formData.getAll("slotHours")[i],
    quota: formData.getAll("slotQuota")[i],
  }));

  if (keptIds.length + newSlots.length < 1) {
    await setFlash("danger", "An event needs at least one timeslot.");
    redirect(editPath);
  }

  // Validate everything up front.
  const existingParsed: { id: number; data: z.infer<typeof timeslotSchema> }[] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = Number(ids[i]);
    if (removeIds.has(id)) continue;
    const parsed = parseSlot({
      date: eDate[i],
      startTime: eStart[i],
      endTime: eEnd[i],
      hoursValue: eHours[i],
      quota: eQuota[i],
    });
    if (!parsed.success) {
      await setFlash("danger", parsed.error.issues[0].message);
      redirect(editPath);
    }
    existingParsed.push({ id, data: parsed.data });
  }

  const newParsed: z.infer<typeof timeslotSchema>[] = [];
  for (const s of newSlots) {
    const parsed = parseSlot(s);
    if (!parsed.success) {
      await setFlash("danger", parsed.error.issues[0].message);
      redirect(editPath);
    }
    newParsed.push(parsed.data);
  }

  await updateEventMeta(eventId, {
    title,
    description: String(formData.get("description") ?? "").trim() || undefined,
    location: String(formData.get("location") ?? "").trim() || undefined,
  });

  const promoted: number[] = [];
  for (const slot of existingParsed) {
    promoted.push(...(await updateTimeslot(slot.id, slot.data)));
  }
  for (const id of removeIds) await deleteTimeslot(id);
  await addTimeslots(eventId, newParsed);

  if (promoted.length > 0) {
    after(() =>
      notifyWaitlistPromoted(promoted, title, "an updated timeslot"),
    );
  }
  // Hours value / slots may have changed retroactively — refresh the mirror.
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "event.edit",
    summary: `Edited event "${title}"`,
    targetType: "event",
    targetId: eventId,
  });

  await setFlash("success", `Updated "${title}".`);
  revalidatePath("/officer/events");
  redirect("/officer/events");
}

export async function cancelEventAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));

  const event = await db.event.findUnique({ where: { id: eventId } });
  const affected = await cancelEvent(eventId);
  if (affected && event) {
    after(() => notifyEventCancelled(affected, event.title));
    after(() => syncSheetsAfterChange());
    await recordAudit({
      actor: officer,
      action: "event.cancel",
      summary: `Cancelled event "${event.title}" (${affected.length} signed up)`,
      targetType: "event",
      targetId: eventId,
    });
    await setFlash("info", `Cancelled "${event.title}". Signed-up members were notified.`);
  } else {
    await setFlash("warning", "That event could not be cancelled.");
  }

  revalidatePath("/officer/events");
  redirect("/officer/events");
}

export async function deleteEventAction(formData: FormData): Promise<void> {
  const officer = await requireUser("officer");
  const eventId = Number(formData.get("eventId"));
  const event = await db.event.findUnique({ where: { id: eventId } });
  await deleteEvent(eventId);
  after(() => syncSheetsAfterChange());
  await recordAudit({
    actor: officer,
    action: "event.delete",
    summary: `Deleted event "${event?.title ?? eventId}"`,
    targetType: "event",
    targetId: eventId,
  });
  await setFlash("info", "Event deleted.");
  revalidatePath("/officer/events");
  redirect("/officer/events");
}

export async function cancelRequestAction(formData: FormData): Promise<void> {
  const member = await requireUser("member");
  const eventId = Number(formData.get("eventId"));
  const title = await cancelOwnRequest(eventId, member.id);
  await setFlash(
    title ? "info" : "warning",
    title ? `Cancelled your request "${title}".` : "Couldn't cancel that request.",
  );
  revalidatePath("/member/dashboard");
  redirect("/member/dashboard");
}
