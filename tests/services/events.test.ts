import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  approveRequest,
  createEvent,
  denyRequest,
  requestEvent,
  updateSlotQuota,
} from "@/lib/services/event-service";
import {
  signupForSlot,
  withdrawFromSlot,
} from "@/lib/services/slot-signup-service";
import { markSlotAttendance } from "@/lib/services/attendance-service";
import { hoursEarnedForUser } from "@/lib/services/member-service";

async function makeUsers(memberCount = 1) {
  const officer = await db.user.create({
    data: {
      firstName: "O",
      lastName: "F",
      email: "o@test.local",
      passwordHash: await hashPassword("password123"),
      role: "officer",
      emailVerifiedAt: new Date(),
    },
  });
  const members = [];
  for (let i = 0; i < memberCount; i++) {
    members.push(
      await db.user.create({
        data: {
          firstName: `M${i}`,
          lastName: "B",
          email: `m${i}@test.local`,
          passwordHash: await hashPassword("password123"),
          role: "member",
          emailVerifiedAt: new Date(),
        },
      }),
    );
  }
  return { officer, members };
}

function inYear() {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

function slot(quota: number, hoursValue = 2) {
  return {
    date: new Date(`${inYear()}T00:00:00.000Z`),
    startTime: "09:00",
    endTime: "11:00",
    hoursValue,
    quota,
  };
}

async function firstSlotId(eventId: number) {
  const s = await db.timeslot.findFirst({ where: { eventId } });
  return s!.id;
}

beforeEach(() => truncateAll(db));

describe("event request lifecycle", () => {
  it("approves a pending request into an active event", async () => {
    const { officer, members } = await makeUsers();
    const req = await requestEvent(
      { title: "Bake Sale", slots: [slot(5)] },
      members[0].id,
    );
    expect(req.status).toBe("pending_approval");

    const approved = await approveRequest(req.id, officer.id);
    expect(approved?.status).toBe("active");
    expect(approved?.approvedById).toBe(officer.id);
  });

  it("denies a pending request (cancelled)", async () => {
    const { members } = await makeUsers();
    const req = await requestEvent(
      { title: "Car Wash", slots: [slot(5)] },
      members[0].id,
    );
    const denied = await denyRequest(req.id);
    expect(denied?.status).toBe("cancelled");
  });
});

describe("slot signups and quota", () => {
  it("confirms up to quota, then waitlists overflow", async () => {
    const { officer, members } = await makeUsers(3);
    const event = await createEvent({ title: "Concert", slots: [slot(2)] }, officer.id);
    const slotId = await firstSlotId(event.id);

    expect(await signupForSlot(slotId, members[0].id)).toBe("confirmed");
    expect(await signupForSlot(slotId, members[1].id)).toBe("confirmed");
    expect(await signupForSlot(slotId, members[2].id)).toBe("waitlisted");
  });

  it("is idempotent on duplicate signup", async () => {
    const { officer, members } = await makeUsers();
    const event = await createEvent({ title: "Concert", slots: [slot(2)] }, officer.id);
    const slotId = await firstSlotId(event.id);
    expect(await signupForSlot(slotId, members[0].id)).toBe("confirmed");
    expect(await signupForSlot(slotId, members[0].id)).toBe("already");
    expect(await db.eventSignup.count()).toBe(1);
  });

  it("promotes the earliest waitlister when a confirmed member withdraws", async () => {
    const { officer, members } = await makeUsers(3);
    const event = await createEvent({ title: "Concert", slots: [slot(2)] }, officer.id);
    const slotId = await firstSlotId(event.id);

    await signupForSlot(slotId, members[0].id); // confirmed
    await signupForSlot(slotId, members[1].id); // confirmed
    await signupForSlot(slotId, members[2].id); // waitlisted

    const { withdrawn, promotedUserId } = await withdrawFromSlot(slotId, members[0].id);
    expect(withdrawn).toBe(true);
    expect(promotedUserId).toBe(members[2].id);

    const promoted = await db.eventSignup.findFirst({
      where: { timeslotId: slotId, userId: members[2].id },
    });
    expect(promoted?.status).toBe("confirmed");
  });

  it("promotes waitlisters when the quota is raised", async () => {
    const { officer, members } = await makeUsers(3);
    const event = await createEvent({ title: "Concert", slots: [slot(1)] }, officer.id);
    const slotId = await firstSlotId(event.id);

    await signupForSlot(slotId, members[0].id); // confirmed
    await signupForSlot(slotId, members[1].id); // waitlisted
    await signupForSlot(slotId, members[2].id); // waitlisted

    const promoted = await updateSlotQuota(slotId, 3);
    expect(promoted.sort()).toEqual([members[1].id, members[2].id].sort());
    expect(await db.eventSignup.count({ where: { status: "confirmed" } })).toBe(3);
  });

  it("blocks signup for non-active events", async () => {
    const { members } = await makeUsers();
    const req = await requestEvent(
      { title: "Pending", slots: [slot(2)] },
      members[0].id,
    );
    const slotId = await firstSlotId(req.id);
    expect(await signupForSlot(slotId, members[0].id)).toBe("not_active");
  });
});

describe("attendance crediting", () => {
  it("credits slot hours, marks the slot/event completed, and reports new credits", async () => {
    const { officer, members } = await makeUsers();
    const event = await createEvent(
      { title: "Festival", slots: [slot(5, 3)] },
      officer.id,
    );
    const slotId = await firstSlotId(event.id);
    await signupForSlot(slotId, members[0].id);

    const result = await markSlotAttendance(slotId, [members[0].id], officer.id);
    expect(result?.credited).toEqual([
      { userId: members[0].id, hours: 3, eventTitle: "Festival" },
    ]);

    const updatedEvent = await db.event.findUnique({ where: { id: event.id } });
    expect(updatedEvent?.status).toBe("completed");
    expect(await hoursEarnedForUser(members[0].id)).toBe(3);
  });

  it("only completes the event once every slot is recorded", async () => {
    const { officer, members } = await makeUsers();
    const event = await createEvent(
      { title: "TwoSlots", slots: [slot(5, 2), slot(5, 2)] },
      officer.id,
    );
    const slots = await db.timeslot.findMany({ where: { eventId: event.id } });

    await markSlotAttendance(slots[0].id, [], officer.id);
    expect((await db.event.findUnique({ where: { id: event.id } }))?.status).toBe(
      "active",
    );
    await markSlotAttendance(slots[1].id, [], officer.id);
    expect((await db.event.findUnique({ where: { id: event.id } }))?.status).toBe(
      "completed",
    );
  });

  it("does not re-credit an already-attended member", async () => {
    const { officer, members } = await makeUsers();
    const event = await createEvent({ title: "Repeat", slots: [slot(5, 2)] }, officer.id);
    const slotId = await firstSlotId(event.id);
    await signupForSlot(slotId, members[0].id);
    await markSlotAttendance(slotId, [members[0].id], officer.id);
    const second = await markSlotAttendance(slotId, [members[0].id], officer.id);
    expect(second?.credited).toHaveLength(0);
    expect(await hoursEarnedForUser(members[0].id)).toBe(2);
  });
});
