import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { truncateAll } from "../helpers/db";
import { hashPassword } from "@/lib/services/auth-service";
import {
  assignHouse,
  bulkAssignHouse,
  HouseAssignmentError,
} from "@/lib/services/house-service";

async function seedUser(role: "member" | "officer", email: string) {
  return db.user.create({
    data: {
      firstName: "Test",
      lastName: role,
      email,
      passwordHash: await hashPassword("Password1!"),
      role,
      emailVerifiedAt: new Date(),
    },
  });
}

beforeEach(async () => {
  await truncateAll(db);
  await db.house.deleteMany();
});

describe("assignHouse", () => {
  it("assigns and clears a member's house", async () => {
    const member = await seedUser("member", "m1@test.local");
    const house = await db.house.create({ data: { name: "House 1", sortOrder: 1 } });

    await assignHouse(member.id, house.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).houseId).toBe(house.id);

    await assignHouse(member.id, null);
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).houseId).toBeNull();
  });

  it("throws HouseAssignmentError for an unknown user", async () => {
    const house = await db.house.create({ data: { name: "House 1", sortOrder: 1 } });
    await expect(assignHouse(999_999, house.id)).rejects.toBeInstanceOf(HouseAssignmentError);
  });

  it("throws HouseAssignmentError for an unknown house", async () => {
    const member = await seedUser("member", "m2@test.local");
    await expect(assignHouse(member.id, 999_999)).rejects.toBeInstanceOf(HouseAssignmentError);
  });
});

describe("bulkAssignHouse", () => {
  it("throws HouseAssignmentError for an unknown house", async () => {
    const member = await seedUser("member", "m3@test.local");
    await expect(bulkAssignHouse([member.id], 999_999)).rejects.toBeInstanceOf(
      HouseAssignmentError,
    );
  });

  it("assigns members only, skipping officers and unknown ids", async () => {
    const member = await seedUser("member", "m4@test.local");
    const officer = await seedUser("officer", "o1@test.local");
    const house = await db.house.create({ data: { name: "House 2", sortOrder: 2 } });

    const count = await bulkAssignHouse([member.id, officer.id, 999_999], house.id);

    expect(count).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).houseId).toBe(house.id);
    expect((await db.user.findUniqueOrThrow({ where: { id: officer.id } })).houseId).toBeNull();
  });

  it("clears houses with null", async () => {
    const member = await seedUser("member", "m5@test.local");
    const house = await db.house.create({ data: { name: "House 3", sortOrder: 3 } });
    await assignHouse(member.id, house.id);

    const count = await bulkAssignHouse([member.id], null);

    expect(count).toBe(1);
    expect((await db.user.findUniqueOrThrow({ where: { id: member.id } })).houseId).toBeNull();
  });
});
