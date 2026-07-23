import type { House } from "@prisma/client";
import { db } from "../db";

export async function listHouses(): Promise<House[]> {
  return db.house.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function renameHouse(id: number, name: string): Promise<void> {
  await db.house.update({ where: { id }, data: { name } });
}

/** Assigns (or clears, with null) a member's house. */
export async function assignHouse(userId: number, houseId: number | null): Promise<void> {
  await db.user.update({ where: { id: userId }, data: { houseId } });
}

export async function bulkAssignHouse(
  userIds: number[],
  houseId: number | null,
): Promise<number> {
  const result = await db.user.updateMany({
    where: { id: { in: userIds }, role: "member" },
    data: { houseId },
  });
  return result.count;
}
