import { describe, expect, it } from "vitest";
import {
  TOTAL_HOURS_GOAL,
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

describe("hoursRemaining", () => {
  it("subtracts from the yearly goal", () => {
    expect(hoursRemaining(3)).toBe(TOTAL_HOURS_GOAL - 3);
  });

  it("never goes negative", () => {
    expect(hoursRemaining(15)).toBe(0);
  });
});

describe("progressColor", () => {
  it("is danger below 3", () => {
    expect(progressColor(0)).toBe("danger");
    expect(progressColor(2.9)).toBe("danger");
  });

  it("is warning from 3 to under 7", () => {
    expect(progressColor(3)).toBe("warning");
    expect(progressColor(6.9)).toBe("warning");
  });

  it("is success at 7 and above", () => {
    expect(progressColor(7)).toBe("success");
    expect(progressColor(12)).toBe("success");
  });
});

describe("progressPct", () => {
  it("converts earned hours to a percentage of the goal", () => {
    expect(progressPct(5)).toBe(50);
  });

  it("caps at 100", () => {
    expect(progressPct(25)).toBe(100);
  });
});
