import { beforeAll, describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "@/lib/crypto-secret";

beforeAll(() => {
  process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
});

describe("crypto-secret", () => {
  it("round-trips a secret", () => {
    const plain = "super-secret-app-password";
    const enc = encryptSecret(plain);
    expect(enc).not.toContain(plain);
    expect(decryptSecret(enc)).toBe(plain);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("x")).not.toBe(encryptSecret("x"));
  });

  it("returns null on tampered or malformed input", () => {
    const enc = encryptSecret("hello");
    expect(decryptSecret(enc.slice(0, -4) + "AAAA")).toBeNull();
    expect(decryptSecret("not-valid")).toBeNull();
    expect(decryptSecret(null)).toBeNull();
  });

  it("returns null when decrypted with a different key", () => {
    const enc = encryptSecret("hello");
    process.env.SESSION_SECRET = "a-completely-different-secret-key";
    expect(decryptSecret(enc)).toBeNull();
    process.env.SESSION_SECRET = "test-secret-at-least-16-chars";
  });
});
