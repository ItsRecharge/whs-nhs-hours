import { db } from "../db";
import { schoolYearRange } from "../hours";

export interface HistoryEntry {
  date: Date;
  source: string; // event title or report description
  kind: "event" | "report";
  hours: number;
}

/**
 * A member's credited-hours breakdown for the current school year: attended
 * timeslots and approved hour reports, newest first.
 */
export async function hoursHistoryForUser(userId: number): Promise<HistoryEntry[]> {
  const { start, end } = schoolYearRange();

  const signups = await db.eventSignup.findMany({
    where: {
      userId,
      attended: true,
      timeslot: { date: { gte: start, lte: end } },
    },
    include: { timeslot: { include: { event: { select: { title: true } } } } },
  });

  const reports = await db.hourReport.findMany({
    where: { userId, status: "approved", date: { gte: start, lte: end } },
  });

  const entries: HistoryEntry[] = [
    ...signups.map((s) => ({
      date: s.timeslot.date,
      source: s.timeslot.event.title,
      kind: "event" as const,
      hours: s.timeslot.hoursValue,
    })),
    ...reports.map((r) => ({
      date: r.date,
      source: r.description,
      kind: "report" as const,
      hours: r.hoursRequested,
    })),
  ];

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}
