import { Prisma } from "@prisma/client";
import { db } from "../db";

export type SignupOutcome = "confirmed" | "waitlisted" | "already" | "not_active";

/**
 * Signs a member up for a timeslot. If the slot's confirmed count is below its
 * quota the signup is "confirmed", otherwise "waitlisted". Idempotent via the
 * unique(timeslotId, userId) constraint.
 */
export async function signupForSlot(
  timeslotId: number,
  userId: number,
): Promise<SignupOutcome> {
  const timeslot = await db.timeslot.findUnique({
    where: { id: timeslotId },
    include: { event: { select: { status: true } } },
  });
  if (!timeslot || timeslot.event.status !== "active") return "not_active";

  try {
    return await db.$transaction(async (tx) => {
      const confirmed = await tx.eventSignup.count({
        where: { timeslotId, status: "confirmed" },
      });
      const status = confirmed < timeslot.quota ? "confirmed" : "waitlisted";
      await tx.eventSignup.create({ data: { timeslotId, userId, status } });
      return status;
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return "already";
    }
    throw err;
  }
}

/**
 * Withdraws a member from a slot (only if attendance not yet marked). If they
 * held a confirmed spot, the earliest waitlister is promoted. Returns whether a
 * withdrawal happened and the promoted userId (if any) for notification.
 */
export async function withdrawFromSlot(
  timeslotId: number,
  userId: number,
): Promise<{ withdrawn: boolean; promotedUserId: number | null }> {
  return db.$transaction(async (tx) => {
    const signup = await tx.eventSignup.findUnique({
      where: { timeslotId_userId: { timeslotId, userId } },
    });
    if (!signup || signup.attended) {
      return { withdrawn: false, promotedUserId: null };
    }

    await tx.eventSignup.delete({ where: { id: signup.id } });

    let promotedUserId: number | null = null;
    if (signup.status === "confirmed") {
      promotedUserId = await promoteOne(tx, timeslotId);
    }
    return { withdrawn: true, promotedUserId };
  });
}

/** Promote the single earliest waitlister to confirmed (within a tx). */
async function promoteOne(
  tx: Prisma.TransactionClient,
  timeslotId: number,
): Promise<number | null> {
  const next = await tx.eventSignup.findFirst({
    where: { timeslotId, status: "waitlisted" },
    orderBy: { signedUpAt: "asc" },
  });
  if (!next) return null;
  await tx.eventSignup.update({
    where: { id: next.id },
    data: { status: "confirmed" },
  });
  return next.userId;
}

/**
 * Promote waitlisters FIFO until the slot's quota is filled. Used after a quota
 * increase. Returns the promoted userIds.
 */
export async function promoteWaitlist(timeslotId: number): Promise<number[]> {
  return db.$transaction(async (tx) => {
    const slot = await tx.timeslot.findUnique({ where: { id: timeslotId } });
    if (!slot) return [];
    const confirmed = await tx.eventSignup.count({
      where: { timeslotId, status: "confirmed" },
    });
    const openings = slot.quota - confirmed;
    if (openings <= 0) return [];

    const waiting = await tx.eventSignup.findMany({
      where: { timeslotId, status: "waitlisted" },
      orderBy: { signedUpAt: "asc" },
      take: openings,
    });
    await Promise.all(
      waiting.map((w) =>
        tx.eventSignup.update({ where: { id: w.id }, data: { status: "confirmed" } }),
      ),
    );
    return waiting.map((w) => w.userId);
  });
}
