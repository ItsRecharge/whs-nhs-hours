import { db } from "@/lib/db";
import { notifyDomainRenewal } from "@/lib/email/notify";

// Re-exported for the officer layout / popup. Defined in templates.ts (a leaf
// module) to avoid a circular import: domain-reminder → notify → templates.
export { RENEWAL_URL, SIGN_IN_EMAIL } from "@/lib/email/templates";

const REMINDER_MONTH = 9; // September
const REMINDER_DAY = 15;
const WINDOW_DAYS = 46; // popup/email active Sept 15 → ~Oct 31

const DAY_MS = 24 * 60 * 60 * 1000;

/** Calendar date (in America/New_York) so the Sept-15 boundary is correct locally. */
function easternDateParts(now: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/**
 * The year `Y` of the active reminder cycle if `now` falls within
 * [Sept 15 Y, Sept 15 Y + WINDOW_DAYS]; otherwise `null`.
 */
export function activeCycleYear(now: Date = new Date()): number | null {
  const { year, month, day } = easternDateParts(now);
  const today = Date.UTC(year, month - 1, day);
  // Most recent Sept 15 on or before today.
  const cycleYear =
    month > REMINDER_MONTH || (month === REMINDER_MONTH && day >= REMINDER_DAY)
      ? year
      : year - 1;
  const start = Date.UTC(cycleYear, REMINDER_MONTH - 1, REMINDER_DAY);
  const end = start + WINDOW_DAYS * DAY_MS;
  return today >= start && today <= end ? cycleYear : null;
}

/**
 * On-visit trigger: if this year's reminder cycle is active and the email hasn't
 * gone out yet, email all officers once and record the year. Never throws into
 * the triggering request.
 */
export async function runDomainReminderCheck(): Promise<void> {
  try {
    const year = activeCycleYear();
    if (year === null) return;
    const settings = await db.chapterSettings.findUnique({ where: { id: 1 } });
    if (settings?.domainReminderSentYear === year) return;
    await notifyDomainRenewal();
    await db.chapterSettings.upsert({
      where: { id: 1 },
      update: { domainReminderSentYear: year },
      create: { id: 1, domainReminderSentYear: year },
    });
  } catch (err) {
    console.error("[domain-reminder] check failed:", err);
  }
}

/** Whether the renewal popup should show for this officer this cycle. */
export async function shouldShowDomainPopupFor(userId: number): Promise<boolean> {
  const year = activeCycleYear();
  if (year === null) return false;
  const dismissal = await db.domainReminderDismissal.findUnique({
    where: { userId_year: { userId, year } },
  });
  return dismissal === null;
}
