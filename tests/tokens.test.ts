import { describe, expect, it } from "vitest";
import { generateToken, hashToken } from "@/lib/tokens";

describe("tokens", () => {
  it("generates unique URL-safe tokens", () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
    expect(a).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.length).toBeGreaterThanOrEqual(40);
  });

  it("hashes deterministically to sha256 hex", () => {
    const raw = generateToken();
    expect(hashToken(raw)).toBe(hashToken(raw));
    expect(hashToken(raw)).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(raw)).not.toBe(hashToken(raw + "x"));
  });
});
