import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import { createEvent, requestEvent } from "@/lib/services/event-service";
import { signupForSlot } from "@/lib/services/slot-signup-service";

async function seedOfficer() {
  return db.user.create({
    data: {
      firstName: "Olive",
      lastName: "Officer",
      email: "officer@test.local",
      passwordHash: await hashPassword("Password1!"),
      role: "officer",
      emailVerifiedAt: new Date(),
    },
  });
}

async function seedMember() {
  return db.user.create({
    data: {
      firstName: "Mia",
      lastName: "Member",
      email: "member@test.local",
      passwordHash: await hashPassword("Password1!"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

const SLOT = {
  date: new Date("2026-10-01T00:00:00Z"),
  startTime: "09:00",
  endTime: "11:00",
  hoursValue: 2,
  quota: 5,
};

beforeEach(async () => {
  await truncateAll(db);
});

describe("deleting a member", () => {
  it("cascades their signups and reports; the event survives", async () => {
    const officer = await seedOfficer();
    const member = await seedMember();
    const event = await createEvent({ title: "Cleanup", slots: [SLOT] }, officer.id);
    const slot = await db.timeslot.findFirstOrThrow({ where: { eventId: event.id } });
    await signupForSlot(slot.id, member.id);
    await db.hourReport.create({
      data: {
        userId: member.id,
        description: "Helped at cleanup",
        date: SLOT.date,
        hoursRequested: 2,
      },
    });

    await db.user.delete({ where: { id: member.id } });

    expect(await db.eventSignup.count()).toBe(0);
    expect(await db.hourReport.count()).toBe(0);
    expect(await db.event.count()).toBe(1);
    expect(await db.timeslot.count()).toBe(1);
  });
});

describe("deleting an officer", () => {
  it("nulls audit-style references and cascades their tokens/links", async () => {
    const officer = await seedOfficer();
    const member = await seedMember();
    const event = await createEvent({ title: "Food Drive", slots: [SLOT] }, officer.id);
    await db.event.update({
      where: { id: event.id },
      data: { approvedById: officer.id },
    });
    const slot = await db.timeslot.findFirstOrThrow({ where: { eventId: event.id } });
    await signupForSlot(slot.id, member.id);
    await db.eventSignup.updateMany({
      where: { timeslotId: slot.id, userId: member.id },
      data: { attended: true, markedById: officer.id },
    });
    const report = await db.hourReport.create({
      data: {
        userId: member.id,
        description: "Outside volunteering",
        date: SLOT.date,
        hoursRequested: 3,
        status: "approved",
        reviewedById: officer.id,
        reviewedAt: new Date(),
      },
    });
    await db.inviteToken.create({
      data: {
        tokenHash: "a".repeat(64),
        createdById: officer.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });
    await db.shareLink.create({
      data: {
        tokenHash: "b".repeat(64),
        kind: "roster",
        organizerName: "Community Pantry",
        createdById: officer.id,
        expiresAt: new Date(Date.now() + 86_400_000),
      },
    });

    await db.user.delete({ where: { id: officer.id } });

    const survivingEvent = await db.event.findUniqueOrThrow({ where: { id: event.id } });
    expect(survivingEvent.createdById).toBeNull();
    expect(survivingEvent.approvedById).toBeNull();

    const signup = await db.eventSignup.findFirstOrThrow({
      where: { timeslotId: slot.id, userId: member.id },
    });
    expect(signup.attended).toBe(true);
    expect(signup.markedById).toBeNull();

    const survivingReport = await db.hourReport.findUniqueOrThrow({ where: { id: report.id } });
    expect(survivingReport.status).toBe("approved");
    expect(survivingReport.reviewedById).toBeNull();

    expect(await db.inviteToken.count()).toBe(0);
    expect(await db.shareLink.count()).toBe(0);
  });
});

describe("deleting a request author", () => {
  it("keeps the pending request with a null creator", async () => {
    const member = await seedMember();
    const request = await requestEvent({ title: "Park Cleanup", slots: [SLOT] }, member.id);

    await db.user.delete({ where: { id: member.id } });

    const surviving = await db.event.findUniqueOrThrow({ where: { id: request.id } });
    expect(surviving.status).toBe("pending_approval");
    expect(surviving.createdById).toBeNull();
  });
});
