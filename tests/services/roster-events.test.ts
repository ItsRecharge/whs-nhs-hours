import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword, verifyCredentials } from "@/lib/services/auth-service";
import {
  BootstrapOfficerProtectionError,
  createAdjustment,
  setMemberActive,
  setMemberRole,
} from "@/lib/services/roster-service";
import { hoursEarnedForUser } from "@/lib/services/member-service";
import {
  cancelEvent,
  cancelOwnRequest,
  createEvent,
  deleteTimeslot,
  requestEvent,
  updateTimeslot,
} from "@/lib/services/event-service";
import { signupForSlot } from "@/lib/services/slot-signup-service";
import { createSessionRow, validateSession } from "@/lib/services/session-service";

async function makeOfficer() {
  return db.user.create({
    data: {
      firstName: "O",
      lastName: "F",
      email: "o@test.local",
      passwordHash: await hashPassword("password123"),
      role: "officer",
      isBootstrapOfficer: false,
      emailVerifiedAt: new Date(),
    },
  });
}
async function makeBootstrapOfficer(createdAt = new Date()) {
  return db.user.create({
    data: {
      firstName: "B",
      lastName: "O",
      email: "bo@test.local",
      passwordHash: await hashPassword("password123"),
      role: "officer",
      isBootstrapOfficer: true,
      createdAt,
      emailVerifiedAt: new Date(),
    },
  });
}
async function makeMember(email = "m@test.local") {
  return db.user.create({
    data: {
      firstName: "M",
      lastName: "B",
      email,
      passwordHash: await hashPassword("password123"),
      role: "member",
      isBootstrapOfficer: false,
      emailVerifiedAt: new Date(),
    },
  });
}
function inYear() {
  const n = new Date();
  return `${n.getUTCFullYear()}-${String(n.getUTCMonth() + 1).padStart(2, "0")}-${String(n.getUTCDate()).padStart(2, "0")}`;
}
function slot(quota = 5, hoursValue = 2) {
  return {
    date: new Date(`${inYear()}T00:00:00.000Z`),
    startTime: "09:00",
    endTime: "11:00",
    hoursValue,
    quota,
  };
}

beforeEach(() => truncateAll(db));

describe("hour adjustments", () => {
  it("credits a positive adjustment and deducts a negative one", async () => {
    const officer = await makeOfficer();
    const member = await makeMember();
    await createAdjustment({
      userId: member.id,
      description: "Bonus",
      date: new Date(`${inYear()}T00:00:00.000Z`),
      hours: 3,
      officerId: officer.id,
    });
    expect(await hoursEarnedForUser(member.id)).toBe(3);
    await createAdjustment({
      userId: member.id,
      description: "Correction",
      date: new Date(`${inYear()}T00:00:00.000Z`),
      hours: -1,
      officerId: officer.id,
    });
    expect(await hoursEarnedForUser(member.id)).toBe(2);
  });
});

describe("roster management", () => {
  it("blocks login for a deactivated member and revokes their sessions", async () => {
    const member = await makeMember();
    const { sid, secret } = await createSessionRow(member.id);

    await setMemberActive(member.id, false);

    const login = await verifyCredentials("m@test.local", "password123");
    expect(login).toEqual({ ok: false, reason: "deactivated" });
    expect(await validateSession(sid, secret)).toBeNull(); // session revoked

    await setMemberActive(member.id, true);
    expect((await verifyCredentials("m@test.local", "password123")).ok).toBe(true);
  });

  it("promotes a member to officer", async () => {
    const member = await makeMember();
    await setMemberRole(member.id, "officer");
    const updated = await db.user.findUnique({ where: { id: member.id } });
    expect(updated?.role).toBe("officer");
  });

  it("protects the bootstrap officer while they hold the role", async () => {
    const bootstrap = await makeBootstrapOfficer();

    await expect(setMemberRole(bootstrap.id, "member")).rejects.toBeInstanceOf(
      BootstrapOfficerProtectionError,
    );
    await expect(setMemberActive(bootstrap.id, false)).rejects.toBeInstanceOf(
      BootstrapOfficerProtectionError,
    );

    const unchanged = await db.user.findUnique({ where: { id: bootstrap.id } });
    expect(unchanged?.role).toBe("officer");
    expect(unchanged?.deactivatedAt).toBeNull();
  });

  it("allows changes once the bootstrap role is handed off", async () => {
    const bootstrap = await makeBootstrapOfficer();
    // Handoff (what transferBootstrapAction does) clears the flag and ends protection.
    await db.user.update({
      where: { id: bootstrap.id },
      data: { isBootstrapOfficer: false },
    });

    await setMemberRole(bootstrap.id, "member");
    await setMemberActive(bootstrap.id, false);

    const updated = await db.user.findUnique({ where: { id: bootstrap.id } });
    expect(updated?.role).toBe("member");
    expect(updated?.deactivatedAt).not.toBeNull();
  });
});

describe("event editing & cancellation", () => {
  it("raising a slot quota via update promotes waitlisters", async () => {
    const officer = await makeOfficer();
    const [a, b] = [await makeMember("a@test.local"), await makeMember("b@test.local")];
    const event = await createEvent({ title: "E", slots: [slot(1)] }, officer.id);
    const slotId = (await db.timeslot.findFirst({ where: { eventId: event.id } }))!.id;
    await signupForSlot(slotId, a.id); // confirmed
    await signupForSlot(slotId, b.id); // waitlisted

    const promoted = await updateTimeslot(slotId, slot(2));
    expect(promoted).toEqual([b.id]);
  });

  it("won't delete the last timeslot", async () => {
    const officer = await makeOfficer();
    const event = await createEvent({ title: "E", slots: [slot()] }, officer.id);
    const slotId = (await db.timeslot.findFirst({ where: { eventId: event.id } }))!.id;
    expect(await deleteTimeslot(slotId)).toBe(false);
  });

  it("cancels an event and returns its signed-up members", async () => {
    const officer = await makeOfficer();
    const member = await makeMember();
    const event = await createEvent({ title: "E", slots: [slot()] }, officer.id);
    const slotId = (await db.timeslot.findFirst({ where: { eventId: event.id } }))!.id;
    await signupForSlot(slotId, member.id);

    const affected = await cancelEvent(event.id);
    expect(affected).toEqual([member.id]);
    expect((await db.event.findUnique({ where: { id: event.id } }))?.status).toBe(
      "cancelled",
    );
  });

  it("lets a member cancel only their own pending request", async () => {
    const officer = await makeOfficer();
    const member = await makeMember();
    const req = await requestEvent({ title: "Mine", slots: [slot()] }, member.id);

    expect(await cancelOwnRequest(req.id, officer.id)).toBeNull(); // not the owner
    expect(await cancelOwnRequest(req.id, member.id)).toBe("Mine");
    expect(await db.event.findUnique({ where: { id: req.id } })).toBeNull();
  });
});
