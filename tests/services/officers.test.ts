import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth-service";
import { listOfficers } from "@/lib/services/roster-service";
import { isBootstrapProtected } from "@/lib/services/bootstrap-service";
import { truncateAll } from "../helpers/db";

async function makeOfficer(
  firstName: string,
  opts: { bootstrap?: boolean; createdAt?: Date } = {},
) {
  return db.user.create({
    data: {
      firstName,
      lastName: "Test",
      email: `${firstName.toLowerCase()}@test.local`,
      passwordHash: await hashPassword("password123"),
      role: "officer",
      isBootstrapOfficer: opts.bootstrap ?? false,
      createdAt: opts.createdAt ?? new Date(),
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("listOfficers + protection", () => {
  it("returns every officer with the bootstrap flag", async () => {
    await makeOfficer("Boot", { bootstrap: true });
    await makeOfficer("Reg");

    const officers = await listOfficers();
    expect(officers).toHaveLength(2);
    expect(officers.find((o) => o.firstName === "Boot")?.isBootstrapOfficer).toBe(true);
    expect(officers.find((o) => o.firstName === "Reg")?.isBootstrapOfficer).toBe(false);
  });

  it("protects only the bootstrap officer, regardless of account age", async () => {
    const old = new Date();
    old.setUTCFullYear(old.getUTCFullYear() - 5);
    const boot = await makeOfficer("Boot", { bootstrap: true, createdAt: old });
    const reg = await makeOfficer("Reg");

    // Protection is tied to holding the role (until handoff), not to a timer.
    expect(isBootstrapProtected(boot)).toBe(true);
    expect(isBootstrapProtected(reg)).toBe(false);
  });
});
