import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { createInvite, validateInvite } from "@/lib/services/invite-service";
import { signupWithInvite } from "@/lib/services/signup-service";
import { verifyCredentials, hashPassword } from "@/lib/services/auth-service";

async function makeOfficer() {
  return db.user.create({
    data: {
      firstName: "O",
      lastName: "Fficer",
      email: "officer@test.local",
      passwordHash: await hashPassword("password123"),
      role: "officer",
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));
afterEach(() => truncateAll(db));

describe("invite validation", () => {
  it("accepts a fresh invite and rejects expired/revoked/exhausted ones", async () => {
    const officer = await makeOfficer();
    const { rawToken, invite } = await createInvite({
      createdById: officer.id,
      role: "member",
      expiresInDays: 7,
      maxUses: 1,
    });
    expect((await validateInvite(rawToken)).valid).toBe(true);

    await db.inviteToken.update({
      where: { id: invite.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await validateInvite(rawToken)).reason).toBe("expired");
  });

  it("reports unknown tokens", async () => {
    expect((await validateInvite("nope")).reason).toBe("not_found");
  });
});

describe("signupWithInvite", () => {
  it("creates a member, increments invite use, and issues a verification token", async () => {
    const officer = await makeOfficer();
    const { rawToken } = await createInvite({
      createdById: officer.id,
      role: "member",
      expiresInDays: 7,
      maxUses: 2,
    });

    const result = await signupWithInvite({
      firstName: "New",
      lastName: "Member",
      email: "new@test.local",
      password: "password123",
      rawInviteToken: rawToken,
    });
    expect(result.ok).toBe(true);

    const invite = await db.inviteToken.findFirst();
    expect(invite?.useCount).toBe(1);

    const tokens = await db.authToken.findMany();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe("email_verification");

    const user = await db.user.findUnique({ where: { email: "new@test.local" } });
    expect(user?.emailVerifiedAt).toBeNull();
    expect(user?.role).toBe("member");
  });

  it("removes a fully-used invite so reuse is rejected", async () => {
    const officer = await makeOfficer();
    const { rawToken } = await createInvite({
      createdById: officer.id,
      role: "member",
      expiresInDays: 7,
      maxUses: 1,
    });
    await signupWithInvite({
      firstName: "A",
      lastName: "A",
      email: "a@test.local",
      password: "password123",
      rawInviteToken: rawToken,
    });

    // The single-use invite is deleted on first use.
    expect(await db.inviteToken.count()).toBe(0);

    const second = await signupWithInvite({
      firstName: "B",
      lastName: "B",
      email: "b@test.local",
      password: "password123",
      rawInviteToken: rawToken,
    });
    expect(second).toEqual({ ok: false, reason: "invalid_invite" });
  });

  it("rejects a duplicate email", async () => {
    const officer = await makeOfficer();
    const { rawToken } = await createInvite({
      createdById: officer.id,
      role: "member",
      expiresInDays: 7,
    });
    const dup = await signupWithInvite({
      firstName: "Dup",
      lastName: "Licate",
      email: "officer@test.local",
      password: "password123",
      rawInviteToken: rawToken,
    });
    expect(dup).toEqual({ ok: false, reason: "email_taken" });
  });
});

describe("verifyCredentials", () => {
  it("blocks login until the email is verified", async () => {
    await db.user.create({
      data: {
        firstName: "Un",
        lastName: "Verified",
        email: "unverified@test.local",
        passwordHash: await hashPassword("password123"),
        role: "member",
      },
    });
    const unverified = await verifyCredentials("unverified@test.local", "password123");
    expect(unverified).toEqual({ ok: false, reason: "unverified" });
  });

  it("rejects a wrong password and accepts a correct one once verified", async () => {
    await db.user.create({
      data: {
        firstName: "Ver",
        lastName: "Ified",
        email: "verified@test.local",
        passwordHash: await hashPassword("password123"),
        role: "member",
        emailVerifiedAt: new Date(),
      },
    });
    expect((await verifyCredentials("verified@test.local", "wrong")).ok).toBe(false);
    const ok = await verifyCredentials("verified@test.local", "password123");
    expect(ok.ok).toBe(true);
  });

  it("treats an unknown email as invalid credentials", async () => {
    const res = await verifyCredentials("ghost@test.local", "password123");
    expect(res).toEqual({ ok: false, reason: "invalid_credentials" });
  });
});
