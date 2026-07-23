import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth-service";
import { issueAuthToken, consumeAuthToken } from "@/lib/services/token-service";
import { truncateAll } from "../helpers/db";

async function makeUser(email = "reset@test.local") {
  return db.user.create({
    data: {
      firstName: "Reset",
      lastName: "User",
      email,
      passwordHash: await hashPassword("password123"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("password reset tokens", () => {
  it("invalidates older unused reset tokens when issuing a new one", async () => {
    const user = await makeUser();
    const first = await issueAuthToken(user.id, "password_reset");
    const second = await issueAuthToken(user.id, "password_reset");

    expect(await consumeAuthToken(first, "password_reset")).toBeNull();
    expect((await consumeAuthToken(second, "password_reset"))?.id).toBe(user.id);
  });

  it("accepts a valid token once and then rejects it", async () => {
    const user = await makeUser();
    const raw = await issueAuthToken(user.id, "password_reset");

    expect((await consumeAuthToken(raw, "password_reset"))?.id).toBe(user.id);
    expect(await consumeAuthToken(raw, "password_reset")).toBeNull();
  });

  it("rejects expired reset tokens", async () => {
    const user = await makeUser();
    const raw = await issueAuthToken(user.id, "password_reset");
    const token = await db.authToken.findFirst({ where: { userId: user.id } });
    expect(token).toBeTruthy();
    await db.authToken.update({
      where: { id: token!.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    expect(await consumeAuthToken(raw, "password_reset")).toBeNull();
  });
});
