import { Prisma, type House } from "@prisma/client";
import { db } from "../db";

/** Thrown when a house assignment targets a user or house that no longer exists. */
export class HouseAssignmentError extends Error {}

export async function listHouses(): Promise<House[]> {
  return db.house.findMany({ orderBy: { sortOrder: "asc" } });
}

export async function renameHouse(id: number, name: string): Promise<void> {
  await db.house.update({ where: { id }, data: { name } });
}

async function ensureHouseExists(houseId: number): Promise<void> {
  const house = await db.house.findUnique({ where: { id: houseId }, select: { id: true } });
  if (!house) throw new HouseAssignmentError("That house no longer exists.");
}

/** Assigns (or clears, with null) a member's house. */
export async function assignHouse(userId: number, houseId: number | null): Promise<void> {
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) throw new HouseAssignmentError("That member no longer exists.");
  if (houseId !== null) await ensureHouseExists(houseId);
  try {
    await db.user.update({ where: { id: userId }, data: { houseId } });
  } catch (err) {
    // Race backstop: user or house deleted between the checks and the write.
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      (err.code === "P2025" || err.code === "P2003")
    ) {
      throw new HouseAssignmentError("That member or house no longer exists.");
    }
    throw err;
  }
}

export async function bulkAssignHouse(
  userIds: number[],
  houseId: number | null,
): Promise<number> {
  if (houseId !== null) await ensureHouseExists(houseId);
  const result = await db.user.updateMany({
    where: { id: { in: userIds }, role: "member" },
    data: { houseId },
  });
  return result.count;
}
