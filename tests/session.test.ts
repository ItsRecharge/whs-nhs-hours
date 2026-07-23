import { beforeAll, describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "@/lib/session-token";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
});

const claims = {
  sid: "sess_123",
  secret: "raw-session-secret",
  role: "officer" as const,
  name: "Pat",
};

describe("session token envelope", () => {
  it("round-trips the session claims", async () => {
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token)).toEqual(claims);
  });

  it("rejects tampered tokens", async () => {
    const token = await signSessionToken(claims);
    expect(await verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifySessionToken("not-a-jwt")).toBeNull();
  });

  it("rejects tokens signed with a different secret", async () => {
    const token = await signSessionToken(claims);
    process.env.SESSION_SECRET = "another-secret-16-chars-long";
    expect(await verifySessionToken(token)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
  });
});
