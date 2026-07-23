import { describe, expect, it } from "vitest";
import { hoursRemaining, progressColor, progressPct } from "@/lib/hours";

describe("configurable goal", () => {
  it("defaults to a 10-hour goal with 3/7 thresholds", () => {
    expect(progressColor(2.9)).toBe("danger");
    expect(progressColor(3)).toBe("warning");
    expect(progressColor(7)).toBe("success");
    expect(hoursRemaining(4)).toBe(6);
    expect(progressPct(5)).toBe(50);
  });

  it("scales thresholds to a custom goal", () => {
    // goal = 20 -> warning at 6, success at 14
    expect(progressColor(5, 20)).toBe("danger");
    expect(progressColor(6, 20)).toBe("warning");
    expect(progressColor(14, 20)).toBe("success");
    expect(hoursRemaining(8, 20)).toBe(12);
    expect(progressPct(10, 20)).toBe(50);
  });

  it("handles a zero goal without dividing by zero", () => {
    expect(progressPct(5, 0)).toBe(100);
  });
});
