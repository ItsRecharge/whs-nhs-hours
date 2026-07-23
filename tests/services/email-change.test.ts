import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import { issueAuthToken } from "@/lib/services/token-service";
import { verifyEmailChangeAction } from "@/actions/account";

async function makeUser(email: string, pendingEmail: string | null = null) {
  return db.user.create({
    data: {
      firstName: "U",
      lastName: "ser",
      email,
      pendingEmail,
      passwordHash: await hashPassword("password123"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("verifyEmailChangeAction", () => {
  it("swaps to the pending email and clears it on a valid token", async () => {
    const user = await makeUser("old@test.local", "new@test.local");
    const token = await issueAuthToken(user.id, "email_change");

    const result = await verifyEmailChangeAction(token);
    expect(result.ok).toBe(true);

    const updated = await db.user.findUnique({ where: { id: user.id } });
    expect(updated?.email).toBe("new@test.local");
    expect(updated?.pendingEmail).toBeNull();
  });

  it("rejects an invalid token", async () => {
    await makeUser("old@test.local", "new@test.local");
    expect(await verifyEmailChangeAction("bogus")).toEqual({ ok: false });
  });

  it("reports when the address was taken before confirmation", async () => {
    const user = await makeUser("old@test.local", "taken@test.local");
    await makeUser("taken@test.local"); // someone else grabbed it
    const token = await issueAuthToken(user.id, "email_change");

    const result = await verifyEmailChangeAction(token);
    expect(result).toEqual({ ok: false, emailInUse: true });

    const unchanged = await db.user.findUnique({ where: { id: user.id } });
    expect(unchanged?.email).toBe("old@test.local");
    expect(unchanged?.pendingEmail).toBeNull();
  });

  it("does nothing if there is no pending email", async () => {
    const user = await makeUser("only@test.local", null);
    const token = await issueAuthToken(user.id, "email_change");
    expect(await verifyEmailChangeAction(token)).toEqual({ ok: false });
  });
});
