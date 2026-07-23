import { beforeAll, describe, expect, it } from "vitest";
import { hoursSummaryEmail } from "@/lib/email/templates";

beforeAll(() => {
  process.env.APP_URL = "http://localhost:3000";
});

describe("hoursSummaryEmail", () => {
  it("nudges members who still need hours", () => {
    const email = hoursSummaryEmail("Sam", 4, 6, 10, "August 31, 2026");
    expect(email.subject).toContain("6 to go");
    expect(email.text).toContain("4 of 10");
    expect(email.text).toContain("need 6 more");
    expect(email.text).toContain("August 31, 2026");
  });

  it("congratulates members who met the goal", () => {
    const email = hoursSummaryEmail("Sam", 10, 0, 10, "August 31, 2026");
    expect(email.subject.toLowerCase()).toContain("completed");
    expect(email.text).toContain("goal met");
    expect(email.text).not.toContain("need");
  });
});
