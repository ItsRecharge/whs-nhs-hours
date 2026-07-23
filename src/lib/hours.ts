// Pure hours/progress logic. All dates use UTC-midnight Date objects with
// date-only semantics.
//
// NHS members complete a cumulative total over junior + senior year — progress
// is NOT windowed to a school year. The goal and the outside-hours cap are
// configurable per chapter (ChapterSettings); the functions here take an
// optional `goal` and fall back to the defaults so callers without settings
// (and tests) keep working. Progress-color thresholds scale to the goal
// (danger <30%, warning <70%, success >=70%).

import type { HourCategory } from "./constants";

export const DEFAULT_TOTAL_HOURS_GOAL = 30.0;
export const DEFAULT_OUTSIDE_HOURS_CAP = 14.0;
export const SCHOOL_YEAR_START_MONTH = 9; // September

export type ProgressColor = "success" | "warning" | "danger";

/**
 * Today as a UTC-midnight Date, derived from the wall-clock date in
 * America/New_York so a UTC evening doesn't flip the school-year boundary.
 */
export function todayLocalDate(now: Date = new Date()): Date {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = fmt.format(now).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

/** School year containing `today`: [Sep 1, Aug 31] as UTC-midnight dates. */
export function schoolYearRange(today: Date = todayLocalDate()): {
  start: Date;
  end: Date;
} {
  const month = today.getUTCMonth() + 1;
  const startYear =
    month >= SCHOOL_YEAR_START_MONTH
      ? today.getUTCFullYear()
      : today.getUTCFullYear() - 1;
  return {
    start: new Date(Date.UTC(startYear, 8, 1)),
    end: new Date(Date.UTC(startYear + 1, 7, 31)),
  };
}

/** Per-member hour totals split by origin and category. */
export interface HoursBreakdown {
  inside: number;
  outside: number;
  /** Outside hours that actually count toward the goal: min(outside, cap). */
  outsideCounted: number;
  /** inside + outsideCounted — the number compared against the goal. */
  total: number;
  byCategory: Record<HourCategory, number>;
  requirements: { tutoring: boolean; soupKitchen: boolean; gardening: boolean };
}

/** Hours counted toward the goal: all inside hours + capped outside hours. */
export function countedTotal(
  inside: number,
  outside: number,
  cap: number = DEFAULT_OUTSIDE_HOURS_CAP,
): number {
  return inside + Math.min(outside, Math.max(0, cap));
}

/**
 * The calendar year the current school year ends in (June side). In Sep–Dec
 * that's next year; in Jan–Aug it's this year.
 */
export function currentSchoolYearEndYear(today: Date = todayLocalDate()): number {
  const month = today.getUTCMonth() + 1;
  return month >= SCHOOL_YEAR_START_MONTH
    ? today.getUTCFullYear() + 1
    : today.getUTCFullYear();
}

/** Graduation year implied by a grade picked at signup. */
export function gradYearForGrade(
  grade: "junior" | "senior",
  today: Date = todayLocalDate(),
): number {
  const endYear = currentSchoolYearEndYear(today);
  return grade === "senior" ? endYear : endYear + 1;
}

export function hoursRemaining(
  earned: number,
  goal: number = DEFAULT_TOTAL_HOURS_GOAL,
): number {
  return Math.max(0, goal - earned);
}

export function progressColor(
  earned: number,
  goal: number = DEFAULT_TOTAL_HOURS_GOAL,
): ProgressColor {
  if (earned >= goal * 0.7) return "success";
  if (earned >= goal * 0.3) return "warning";
  return "danger";
}

export function progressPct(
  earned: number,
  goal: number = DEFAULT_TOTAL_HOURS_GOAL,
): number {
  if (goal <= 0) return 100;
  return Math.min(100, Math.round((earned / goal) * 100));
}
