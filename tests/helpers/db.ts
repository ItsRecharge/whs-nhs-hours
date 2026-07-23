import type { PrismaClient } from "@prisma/client";

/** Wipe all rows between tests (respecting FK order). */
export async function truncateAll(db: PrismaClient): Promise<void> {
  await db.eventSignup.deleteMany();
  await db.hourReport.deleteMany();
  await db.authToken.deleteMany();
  await db.session.deleteMany();
  await db.inviteToken.deleteMany();
  await db.timeslot.deleteMany();
  await db.event.deleteMany();
  await db.auditLog.deleteMany();
  await db.integrationSettings.deleteMany();
  await db.chapterSettings.deleteMany();
  await db.user.deleteMany();
}
