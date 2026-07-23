// Pure hours/progress logic, ported from the original Flask app/utils/hours.py.
// All dates use UTC-midnight Date objects with date-only semantics.
//
// The yearly goal is configurable per chapter (ChapterSettings); the functions
// here take an optional `goal` and fall back to DEFAULT_TOTAL_HOURS_GOAL so
// callers without settings (and tests) keep working. Progress-color thresholds
// scale to the goal (danger <30%, warning <70%, success >=70%).

export const DEFAULT_TOTAL_HOURS_GOAL = 10.0;
/** @deprecated Use the configurable goal from ChapterSettings where possible. */
export const TOTAL_HOURS_GOAL = DEFAULT_TOTAL_HOURS_GOAL;
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
