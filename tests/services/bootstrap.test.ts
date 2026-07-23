import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/services/auth-service";
import { getBootstrapOfficer } from "@/lib/services/bootstrap-service";
import { truncateAll } from "../helpers/db";

beforeEach(() => truncateAll(db));

describe("verifyPassword", () => {
  it("accepts the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword(hash, "correct-horse")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
});

describe("getBootstrapOfficer", () => {
  it("returns the flagged bootstrap officer, or null when none exists", async () => {
    expect(await getBootstrapOfficer()).toBeNull();

    await db.user.create({
      data: {
        firstName: "Boot",
        lastName: "Strap",
        email: "boot@test.local",
        passwordHash: await hashPassword("password123"),
        role: "officer",
        isBootstrapOfficer: true,
        emailVerifiedAt: new Date(),
      },
    });

    const boot = await getBootstrapOfficer();
    expect(boot?.email).toBe("boot@test.local");
  });
});
