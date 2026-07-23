import { db } from "../db";
import { hoursRemaining, countedTotal, currentSchoolYearEndYear, todayLocalDate } from "../hours";
import type { HoursBreakdown } from "../hours";
import { HOUR_CATEGORIES, type HourCategory } from "../constants";
import { getChapterSettings } from "./chapter-service";

export interface MemberProgress {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number | null;
  house: { id: number; name: string } | null;
  emailVerifiedAt: Date | null;
  deactivatedAt: Date | null;
  createdAt: Date;
  /** Hours counted toward the goal (inside + capped outside). */
  earned: number;
  remaining: number;
  breakdown: HoursBreakdown;
}

function emptyByCategory(): Record<HourCategory, number> {
  return Object.fromEntries(HOUR_CATEGORIES.map((c) => [c, 0])) as Record<
    HourCategory,
    number
  >;
}

function asCategory(raw: string): HourCategory {
  return (HOUR_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as HourCategory)
    : "general";
}

interface CreditRow {
  hours: number;
  category: string;
  origin: "inside" | "outside";
}

function buildBreakdown(rows: CreditRow[], outsideCap: number): HoursBreakdown {
  let inside = 0;
  let outside = 0;
  const byCategory = emptyByCategory();
  for (const row of rows) {
    if (row.origin === "outside") outside += row.hours;
    else inside += row.hours;
    byCategory[asCategory(row.category)] += row.hours;
  }
  const total = countedTotal(inside, outside, outsideCap);
  return {
    inside,
    outside,
    outsideCounted: Math.min(outside, Math.max(0, outsideCap)),
    total,
    byCategory,
    requirements: {
      tutoring: byCategory.tutoring >= 1,
      soupKitchen: byCategory.soup_kitchen >= 1,
      gardening: byCategory.gardening >= 1,
    },
  };
}

/**
 * Credit rows for a set of users over their whole membership (NHS hours are
 * cumulative across junior + senior year — no school-year window). Attended
 * timeslots are inside hours with the event's category; approved hour reports
 * carry their own origin and category.
 */
async function creditRowsForUsers(
  userIds: number[],
): Promise<Map<number, CreditRow[]>> {
  const map = new Map<number, CreditRow[]>(userIds.map((id) => [id, []]));
  if (userIds.length === 0) return map;

  const [signups, reports] = await Promise.all([
    db.eventSignup.findMany({
      where: { userId: { in: userIds }, attended: true },
      select: {
        userId: true,
        timeslot: {
          select: { hoursValue: true, event: { select: { category: true } } },
        },
      },
    }),
    db.hourReport.findMany({
      where: { userId: { in: userIds }, status: "approved" },
      select: { userId: true, hoursRequested: true, category: true, origin: true },
    }),
  ]);

  for (const s of signups) {
    map.get(s.userId)?.push({
      hours: s.timeslot.hoursValue,
      category: s.timeslot.event.category,
      origin: "inside",
    });
  }
  for (const r of reports) {
    map.get(r.userId)?.push({
      hours: r.hoursRequested,
      category: r.category,
      origin: r.origin === "outside" ? "outside" : "inside",
    });
  }
  return map;
}

/** Full inside/outside/category breakdown for one user. */
export async function hoursBreakdownForUser(userId: number): Promise<HoursBreakdown> {
  const [rowsByUser, settings] = await Promise.all([
    creditRowsForUsers([userId]),
    getChapterSettings(),
  ]);
  return buildBreakdown(rowsByUser.get(userId) ?? [], settings.outsideHoursCap);
}

/**
 * Hours a user has earned toward the goal (inside + capped outside), over the
 * whole membership.
 */
export async function hoursEarnedForUser(userId: number): Promise<number> {
  return (await hoursBreakdownForUser(userId)).total;
}

/** All members with computed hours, sorted by remaining (most-needed first). */
export async function listMembersWithProgress(): Promise<MemberProgress[]> {
  const [members, settings] = await Promise.all([
    db.user.findMany({
      where: { role: "member" },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        graduationYear: true,
        house: { select: { id: true, name: true } },
        emailVerifiedAt: true,
        deactivatedAt: true,
        createdAt: true,
      },
      orderBy: { firstName: "asc" },
    }),
    getChapterSettings(),
  ]);

  const rowsByUser = await creditRowsForUsers(members.map((m) => m.id));

  const withHours = members.map((m) => {
    const breakdown = buildBreakdown(rowsByUser.get(m.id) ?? [], settings.outsideHoursCap);
    return {
      ...m,
      earned: breakdown.total,
      remaining: hoursRemaining(breakdown.total, settings.totalHoursGoal),
      breakdown,
    };
  });

  return withHours.sort((a, b) => b.remaining - a.remaining);
}

/**
 * Graduated-senior rollover info: once the configured school-year-end date has
 * passed, counts still-active members whose class has graduated so officers
 * can bulk-deactivate them.
 */
export async function graduatedSeniorInfo(): Promise<{
  show: boolean;
  count: number;
  cutoffYear: number;
}> {
  const settings = await getChapterSettings();
  const today = todayLocalDate();
  const endYear = currentSchoolYearEndYear(today);

  // The most recent school-year-end date that has already passed.
  const thisYearsEnd = new Date(
    Date.UTC(endYear, settings.schoolYearEndMonth - 1, settings.schoolYearEndDay),
  );
  const cutoffYear = today >= thisYearsEnd ? endYear : endYear - 1;

  const count = await db.user.count({
    where: {
      role: "member",
      deactivatedAt: null,
      graduationYear: { not: null, lte: cutoffYear },
    },
  });

  return { show: count > 0, count, cutoffYear };
}
