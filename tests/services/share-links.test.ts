import { beforeEach, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import {
  createShareLink,
  validateShareLink,
  revokeShareLink,
  listShareLinks,
} from "@/lib/services/share-service";
import { truncateAll } from "../helpers/db";

beforeEach(() => truncateAll(db));

async function makeOfficer() {
  return db.user.create({
    data: {
      firstName: "Off",
      lastName: "Icer",
      email: "officer@test.local",
      passwordHash: await bcrypt.hash("Password1!", 4),
      role: "officer",
      emailVerifiedAt: new Date(),
    },
  });
}

async function makeEvent(officerId: number) {
  return db.event.create({
    data: { title: "Park Cleanup", status: "active", createdById: officerId },
  });
}

describe("share links", () => {
  it("creates and validates a roster link", async () => {
    const officer = await makeOfficer();
    const { rawToken } = await createShareLink({
      kind: "roster",
      organizerName: "Food Pantry",
      createdById: officer.id,
      expiresInDays: 30,
    });
    const link = await validateShareLink(rawToken, "roster");
    expect(link?.organizerName).toBe("Food Pantry");
  });

  it("rejects kind mismatch", async () => {
    const officer = await makeOfficer();
    const event = await makeEvent(officer.id);
    const { rawToken } = await createShareLink({
      kind: "attendance",
      eventId: event.id,
      organizerName: "Pantry",
      createdById: officer.id,
      expiresInDays: 30,
    });
    expect(await validateShareLink(rawToken, "roster")).toBeNull();
    expect(await validateShareLink(rawToken, "attendance")).not.toBeNull();
  });

  it("rejects revoked and expired links", async () => {
    const officer = await makeOfficer();
    const { link, rawToken } = await createShareLink({
      kind: "roster",
      organizerName: "Pantry",
      createdById: officer.id,
      expiresInDays: 30,
    });
    await revokeShareLink(link.id);
    expect(await validateShareLink(rawToken, "roster")).toBeNull();

    const { link: link2, rawToken: raw2 } = await createShareLink({
      kind: "roster",
      organizerName: "Pantry",
      createdById: officer.id,
      expiresInDays: 1,
    });
    await db.shareLink.update({
      where: { id: link2.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateShareLink(raw2, "roster")).toBeNull();
  });

  it("rejects garbage tokens", async () => {
    expect(await validateShareLink("", "roster")).toBeNull();
    expect(await validateShareLink("nonsense", "roster")).toBeNull();
  });

  it("requires an event for attendance links", async () => {
    const officer = await makeOfficer();
    await expect(
      createShareLink({
        kind: "attendance",
        organizerName: "Pantry",
        createdById: officer.id,
        expiresInDays: 30,
      }),
    ).rejects.toThrow();
  });

  it("lists only usable links with organizer info", async () => {
    const officer = await makeOfficer();
    const { link } = await createShareLink({
      kind: "roster",
      organizerName: "Pantry",
      organizerEmail: "dana@pantry.org",
      createdById: officer.id,
      expiresInDays: 30,
    });
    await createShareLink({
      kind: "roster",
      organizerName: "Revoked Org",
      createdById: officer.id,
      expiresInDays: 30,
    }).then(({ link }) => revokeShareLink(link.id));

    const links = await listShareLinks();
    expect(links.map((l) => l.id)).toEqual([link.id]);
    expect(links[0].organizerEmail).toBe("dana@pantry.org");
  });
});
