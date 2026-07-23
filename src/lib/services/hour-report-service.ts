import type { HourReport } from "@prisma/client";
import { db } from "../db";

export async function createReport(input: {
  userId: number;
  description: string;
  notes?: string;
  date: Date;
  hoursRequested: number;
}): Promise<HourReport> {
  return db.hourReport.create({
    data: {
      userId: input.userId,
      description: input.description,
      notes: input.notes ?? null,
      date: input.date,
      hoursRequested: input.hoursRequested,
      status: "pending",
    },
  });
}

/** Approves or denies a pending report. Returns the report + owner, or null. */
export async function reviewReport(
  reportId: number,
  approve: boolean,
  officerId: number,
): Promise<
  | (HourReport & { user: { firstName: string; lastName: string; email: string } })
  | null
> {
  const report = await db.hourReport.findUnique({ where: { id: reportId } });
  if (!report || report.status !== "pending") return null;
  return db.hourReport.update({
    where: { id: reportId },
    data: {
      status: approve ? "approved" : "denied",
      reviewedById: officerId,
      reviewedAt: new Date(),
    },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });
}

export async function listPendingReports() {
  return db.hourReport.findMany({
    where: { status: "pending" },
    include: { user: { select: { firstName: true, lastName: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function listReportsForUser(userId: number) {
  return db.hourReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}
