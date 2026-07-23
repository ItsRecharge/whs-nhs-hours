import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  createSessionRow,
  revokeAllUserSessions,
  revokeSession,
  validateSession,
} from "@/lib/services/session-service";

async function makeUser() {
  return db.user.create({
    data: {
      firstName: "S",
      lastName: "U",
      email: "s@test.local",
      passwordHash: await hashPassword("password123"),
      role: "member",
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("sessions", () => {
  it("validates a fresh session and resolves its user", async () => {
    const user = await makeUser();
    const { sid, secret } = await createSessionRow(user.id);
    const session = await validateSession(sid, secret);
    expect(session?.user.id).toBe(user.id);
  });

  it("rejects a wrong secret", async () => {
    const user = await makeUser();
    const { sid } = await createSessionRow(user.id);
    expect(await validateSession(sid, "wrong-secret")).toBeNull();
  });

  it("rejects a revoked session", async () => {
    const user = await makeUser();
    const { sid, secret } = await createSessionRow(user.id);
    await revokeSession(sid);
    expect(await validateSession(sid, secret)).toBeNull();
  });

  it("rejects an expired session", async () => {
    const user = await makeUser();
    const { sid, secret } = await createSessionRow(user.id);
    await db.session.update({
      where: { id: sid },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await validateSession(sid, secret)).toBeNull();
  });

  it("revokes every session for a user (password reset / log out everywhere)", async () => {
    const user = await makeUser();
    const a = await createSessionRow(user.id);
    const b = await createSessionRow(user.id);
    await revokeAllUserSessions(user.id);
    expect(await validateSession(a.sid, a.secret)).toBeNull();
    expect(await validateSession(b.sid, b.secret)).toBeNull();
  });
});
