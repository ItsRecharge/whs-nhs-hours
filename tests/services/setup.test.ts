import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import { isFirstRun } from "@/lib/services/setup-service";
import { TEST_TEMPLATES } from "@/lib/email/test-registry";

beforeEach(async () => {
  await truncateAll(db);
});

describe("isFirstRun", () => {
  it("is true on an empty database", async () => {
    expect(await isFirstRun()).toBe(true);
  });

  it("stays true when only members exist", async () => {
    await db.user.create({
      data: {
        firstName: "Mem",
        lastName: "Ber",
        email: "member@example.com",
        passwordHash: await hashPassword("password123"),
        role: "member",
        emailVerifiedAt: new Date(),
      },
    });
    expect(await isFirstRun()).toBe(true);
  });

  it("is false once an officer exists", async () => {
    await db.user.create({
      data: {
        firstName: "Off",
        lastName: "Icer",
        email: "officer@example.com",
        passwordHash: await hashPassword("password123"),
        role: "officer",
        emailVerifiedAt: new Date(),
      },
    });
    expect(await isFirstRun()).toBe(false);
  });
});

describe("email test registry", () => {
  it("every template builds non-empty content from its defaults", () => {
    for (const [key, entry] of Object.entries(TEST_TEMPLATES)) {
      const values: Record<string, string> = {};
      for (const field of entry.fields) values[field.name] = field.default;

      const content = entry.build(values);
      expect(content.subject, `${key} subject`).toBeTruthy();
      expect(content.html, `${key} html`).toContain("<");
      expect(content.text, `${key} text`).toBeTruthy();
    }
  });
});
