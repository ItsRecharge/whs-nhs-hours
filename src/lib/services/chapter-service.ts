import type { ChapterSettings } from "@prisma/client";
import { db } from "../db";
import { getEnv } from "../env";
import { DEFAULT_TOTAL_HOURS_GOAL } from "../hours";

/** Reads the singleton chapter settings, creating defaults on first use. */
export async function getChapterSettings(): Promise<ChapterSettings> {
  const existing = await db.chapterSettings.findUnique({ where: { id: 1 } });
  if (existing) return existing;
  return db.chapterSettings.create({
    data: { id: 1, totalHoursGoal: DEFAULT_TOTAL_HOURS_GOAL },
  });
}

/** Convenience: just the total hours goal. */
export async function getTotalGoal(): Promise<number> {
  return (await getChapterSettings()).totalHoursGoal;
}

export async function updateChapterSettings(input: {
  chapterName: string;
  totalHoursGoal: number;
  outsideHoursCap: number;
  schoolYearEndMonth: number;
  schoolYearEndDay: number;
  publicUrl: string | null;
}): Promise<ChapterSettings> {
  return db.chapterSettings.upsert({
    where: { id: 1 },
    update: input,
    create: { id: 1, ...input },
  });
}

/**
 * The public base URL used in email links — the chapter's configured `publicUrl`
 * if set, otherwise the `APP_URL` env fallback. Never has a trailing slash.
 */
export async function getPublicBaseUrl(): Promise<string> {
  const settings = await getChapterSettings();
  const raw = settings.publicUrl?.trim() || getEnv().APP_URL;
  return raw.replace(/\/$/, "");
}
