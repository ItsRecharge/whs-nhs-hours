import { describe, expect, it } from "vitest";
import { chapterSettingsSchema } from "@/lib/validation";

function parse(overrides: Record<string, unknown>) {
  return chapterSettingsSchema.safeParse({
    chapterName: "Aberjona NHS Chapter",
    totalHoursGoal: 30,
    outsideHoursCap: 14,
    schoolYearEndMonth: 6,
    schoolYearEndDay: 30,
    publicUrl: "",
    ...overrides,
  });
}

describe("chapterSettingsSchema school-year end date", () => {
  it.each([
    [6, 31], // June has 30 days
    [2, 30],
    [2, 29], // recurring annual date — reject leap-only day
    [4, 31],
    [11, 31],
  ])("rejects month %i day %i", (schoolYearEndMonth, schoolYearEndDay) => {
    const result = parse({ schoolYearEndMonth, schoolYearEndDay });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("schoolYearEndDay");
    }
  });

  it.each([
    [6, 30],
    [2, 28],
    [12, 31],
    [1, 31],
    [7, 31],
  ])("accepts month %i day %i", (schoolYearEndMonth, schoolYearEndDay) => {
    expect(parse({ schoolYearEndMonth, schoolYearEndDay }).success).toBe(true);
  });

  it("still enforces the outside-cap-vs-goal refine", () => {
    const result = parse({ outsideHoursCap: 40 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("outsideHoursCap");
    }
  });
});
