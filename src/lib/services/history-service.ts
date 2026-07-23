import { db } from "../db";
import type { HourCategory, HourOrigin } from "../constants";
import { HOUR_CATEGORIES } from "../constants";

export interface HistoryEntry {
  date: Date;
  source: string; // event title or report description
  kind: "event" | "report";
  hours: number;
  category: HourCategory;
  origin: HourOrigin;
}

function asCategory(raw: string): HourCategory {
  return (HOUR_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as HourCategory)
    : "general";
}

/**
 * A member's credited-hours history over their whole membership (NHS hours are
 * cumulative across junior + senior year): attended timeslots and approved
 * hour reports, newest first.
 */
export async function hoursHistoryForUser(userId: number): Promise<HistoryEntry[]> {
  const signups = await db.eventSignup.findMany({
    where: { userId, attended: true },
    include: {
      timeslot: { include: { event: { select: { title: true, category: true } } } },
    },
  });

  const reports = await db.hourReport.findMany({
    where: { userId, status: "approved" },
  });

  const entries: HistoryEntry[] = [
    ...signups.map((s) => ({
      date: s.timeslot.date,
      source: s.timeslot.event.title,
      kind: "event" as const,
      hours: s.timeslot.hoursValue,
      category: asCategory(s.timeslot.event.category),
      origin: "inside" as const,
    })),
    ...reports.map((r) => ({
      date: r.date,
      source: r.description,
      kind: "report" as const,
      hours: r.hoursRequested,
      category: asCategory(r.category),
      origin: (r.origin === "outside" ? "outside" : "inside") as HourOrigin,
    })),
  ];

  return entries.sort((a, b) => b.date.getTime() - a.date.getTime());
}
