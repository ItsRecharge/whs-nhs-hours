import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/services/auth-service";
import { isSuperAdmin } from "@/lib/ops-access";
import { signOpsGrant, verifyOpsGrant } from "@/lib/ops-grant";
import { truncateAll } from "../helpers/db";

async function makeBootstrapOfficer(createdAt = new Date()) {
  return db.user.create({
    data: {
      firstName: "B",
      lastName: "O",
      email: "boot@test.local",
      passwordHash: await hashPassword("password123"),
      role: "officer",
      isBootstrapOfficer: true,
      createdAt,
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(() => truncateAll(db));

describe("ops access", () => {
  it("treats the protected bootstrap officer as a super admin", async () => {
    const createdAt = new Date();
    createdAt.setUTCMonth(createdAt.getUTCMonth() - 2);
    const bootstrap = await makeBootstrapOfficer(createdAt);

    expect(isSuperAdmin(bootstrap)).toBe(true);
  });

  it("signs and verifies an ops grant token", async () => {
    const bootstrap = await makeBootstrapOfficer();
    const token = await signOpsGrant({
      userId: bootstrap.id,
      email: bootstrap.email,
      bootstrap: bootstrap.isBootstrapOfficer,
    });

    expect(await verifyOpsGrant(token)).toEqual({
      userId: bootstrap.id,
      email: bootstrap.email,
      bootstrap: true,
    });
  });
});