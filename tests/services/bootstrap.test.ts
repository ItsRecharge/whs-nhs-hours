import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/services/auth-service";
import { listAdmins } from "@/lib/services/bootstrap-service";
import { truncateAll } from "../helpers/db";

beforeEach(() => truncateAll(db));

describe("verifyPassword", () => {
  it("accepts the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword(hash, "correct-horse")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
  });
});

describe("listAdmins", () => {
  it("returns every active flagged admin, or an empty list when none exist", async () => {
    expect(await listAdmins()).toEqual([]);

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

    await db.user.create({
      data: {
        firstName: "Gone",
        lastName: "Admin",
        email: "gone@test.local",
        passwordHash: await hashPassword("password123"),
        role: "officer",
        isBootstrapOfficer: true,
        deactivatedAt: new Date(),
        emailVerifiedAt: new Date(),
      },
    });

    const admins = await listAdmins();
    expect(admins.map((a) => a.email)).toEqual(["boot@test.local"]);
  });
});
