import { describe, expect, it } from "vitest";
import {
  DEFAULT_TOTAL_HOURS_GOAL,
  DEFAULT_OUTSIDE_HOURS_CAP,
  countedTotal,
  currentSchoolYearEndYear,
  gradYearForGrade,
  hoursRemaining,
  progressColor,
  progressPct,
  schoolYearRange,
  todayLocalDate,
} from "@/lib/hours";

const utc = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d));

describe("schoolYearRange", () => {
  it("starts a new school year on September 1", () => {
    const { start, end } = schoolYearRange(utc(2025, 9, 1));
    expect(start).toEqual(utc(2025, 9, 1));
    expect(end).toEqual(utc(2026, 8, 31));
  });

  it("keeps August 31 in the previous school year", () => {
    const { start, end } = schoolYearRange(utc(2025, 8, 31));
    expect(start).toEqual(utc(2024, 9, 1));
    expect(end).toEqual(utc(2025, 8, 31));
  });

  it("carries spring dates back to the fall start year", () => {
    const { start, end } = schoolYearRange(utc(2026, 3, 15));
    expect(start).toEqual(utc(2025, 9, 1));
    expect(end).toEqual(utc(2026, 8, 31));
  });
});

describe("todayLocalDate", () => {
  it("uses the New York wall-clock date, not UTC", () => {
    // 2025-09-01T02:00Z is still Aug 31 in New York (UTC-4)
    const d = todayLocalDate(new Date("2025-09-01T02:00:00Z"));
    expect(d).toEqual(utc(2025, 8, 31));
  });

  it("matches UTC during the day", () => {
    const d = todayLocalDate(new Date("2025-09-01T15:00:00Z"));
    expect(d).toEqual(utc(2025, 9, 1));
  });
});

describe("countedTotal", () => {
  it("counts all inside hours plus outside up to the cap", () => {
    expect(countedTotal(10, 5, 14)).toBe(15);
  });

  it("caps outside hours (15 outside → 14 counted)", () => {
    expect(countedTotal(10, 15, 14)).toBe(24);
  });

  it("uses the default cap when omitted", () => {
    expect(countedTotal(0, 100)).toBe(DEFAULT_OUTSIDE_HOURS_CAP);
  });

  it("treats a negative cap as zero", () => {
    expect(countedTotal(5, 10, -1)).toBe(5);
  });
});

describe("currentSchoolYearEndYear / gradYearForGrade", () => {
  it("ends next calendar year during the fall", () => {
    expect(currentSchoolYearEndYear(utc(2026, 9, 1))).toBe(2027);
  });

  it("ends this calendar year during the spring/summer", () => {
    expect(currentSchoolYearEndYear(utc(2026, 8, 31))).toBe(2026);
    expect(currentSchoolYearEndYear(utc(2026, 3, 15))).toBe(2026);
  });

  it("seniors graduate at the school-year end; juniors a year later", () => {
    // Fall 2026 → school year ends 2027
    expect(gradYearForGrade("senior", utc(2026, 10, 1))).toBe(2027);
    expect(gradYearForGrade("junior", utc(2026, 10, 1))).toBe(2028);
    // Spring 2027 (same school year)
    expect(gradYearForGrade("senior", utc(2027, 3, 1))).toBe(2027);
    expect(gradYearForGrade("junior", utc(2027, 3, 1))).toBe(2028);
  });
});

describe("hoursRemaining", () => {
  it("subtracts from the default total goal", () => {
    expect(hoursRemaining(3)).toBe(DEFAULT_TOTAL_HOURS_GOAL - 3);
  });

  it("respects an explicit goal", () => {
    expect(hoursRemaining(3, 10)).toBe(7);
  });

  it("never goes negative", () => {
    expect(hoursRemaining(45)).toBe(0);
  });
});

describe("progressColor", () => {
  it("is danger below 30% of the goal", () => {
    expect(progressColor(0, 10)).toBe("danger");
    expect(progressColor(2.9, 10)).toBe("danger");
  });

  it("is warning from 30% to under 70%", () => {
    expect(progressColor(3, 10)).toBe("warning");
    expect(progressColor(6.9, 10)).toBe("warning");
  });

  it("is success at 70% and above", () => {
    expect(progressColor(7, 10)).toBe("success");
    expect(progressColor(12, 10)).toBe("success");
  });
});

describe("progressPct", () => {
  it("converts earned hours to a percentage of the goal", () => {
    expect(progressPct(5, 10)).toBe(50);
  });

  it("caps at 100", () => {
    expect(progressPct(25, 10)).toBe(100);
  });
});
