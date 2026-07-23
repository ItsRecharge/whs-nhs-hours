import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { getEnv } from "@/lib/env";
import { getPublicBaseUrl, updateChapterSettings } from "@/lib/services/chapter-service";
import { truncateAll } from "../helpers/db";

beforeEach(() => truncateAll(db));

describe("getPublicBaseUrl", () => {
  it("falls back to APP_URL when no publicUrl is configured", async () => {
    const expected = getEnv().APP_URL.replace(/\/$/, "");
    expect(await getPublicBaseUrl()).toBe(expected);
  });

  it("uses the configured publicUrl and strips a trailing slash", async () => {
    await updateChapterSettings({
      chapterName: "Test Chapter",
      totalHoursGoal: 30,
      outsideHoursCap: 14,
      schoolYearEndMonth: 6,
      schoolYearEndDay: 30,
      publicUrl: "https://nhs.example.com/",
    });
    expect(await getPublicBaseUrl()).toBe("https://nhs.example.com");
  });
});
