import { db } from "@/lib/db";
import { fullName } from "@/lib/current-user";
import { hoursEarnedForUser } from "@/lib/services/member-service";
import { getPublicBaseUrl, getTotalGoal } from "@/lib/services/chapter-service";
import { hoursRemaining, schoolYearRange } from "@/lib/hours";
import { sendMail } from "./mailer";
import {
  domainRenewalEmail,
  eventCancelledEmail,
  eventPostedEmail,
  hourReportDecisionEmail,
  hoursCreditedEmail,
  hoursSummaryEmail,
  newRequestEmail,
  requestDecisionEmail,
  waitlistPromotedEmail,
} from "./templates";

const BCC_CHUNK = 80; // stay well under Gmail's ~500 recipients/day per blast

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Email failures must never break the triggering request. */
async function safeSend(fn: () => Promise<unknown>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    console.error("[notify] email send failed:", err);
  }
}

async function verifiedEmailsByRole(role: string): Promise<string[]> {
  const users = await db.user.findMany({
    where: { role, emailVerifiedAt: { not: null }, deactivatedAt: null },
    select: { email: true },
  });
  return users.map((u) => u.email);
}

function dateLabel(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export async function notifyEventPosted(event: {
  title: string;
  slots: { date: Date; startTime: string; endTime: string }[];
}): Promise<void> {
  await safeSend(async () => {
    const recipients = await verifiedEmailsByRole("member");
    if (recipients.length === 0) return;
    const whenLabel =
      event.slots.length === 1
        ? `${dateLabel(event.slots[0].date)}, ${event.slots[0].startTime}–${event.slots[0].endTime}`
        : `${event.slots.length} timeslots starting ${dateLabel(event.slots[0].date)}`;
    const content = eventPostedEmail(event.title, whenLabel, await getPublicBaseUrl());
    for (const group of chunk(recipients, BCC_CHUNK)) {
      await sendMail({ bcc: group, ...content });
    }
  });
}

export async function notifyRequestDecision(
  userId: number,
  eventTitle: string,
  approved: boolean,
): Promise<void> {
  await safeSend(async () => {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt || user.deactivatedAt) return;
    await sendMail({
      to: user.email,
      ...requestDecisionEmail(eventTitle, approved, await getPublicBaseUrl()),
    });
  });
}

export async function notifyHoursCredited(
  credits: { userId: number; hours: number; eventTitle: string }[],
): Promise<void> {
  await safeSend(async () => {
    const baseUrl = await getPublicBaseUrl();
    for (const c of credits) {
      const user = await db.user.findUnique({ where: { id: c.userId } });
      if (!user?.emailVerifiedAt || user.deactivatedAt) continue;
      await sendMail({
        to: user.email,
        ...hoursCreditedEmail(fullName(user), c.hours, c.eventTitle, baseUrl),
      });
    }
  });
}

/**
 * Officer-triggered: emails every verified, active member a personalized hours
 * summary (earned / remaining vs the chapter goal) as an end-of-year reminder.
 * Each send is isolated so one bad address doesn't abort the batch.
 */
export async function notifyHoursSummary(): Promise<void> {
  await safeSend(async () => {
    const goal = await getTotalGoal();
    const { end } = schoolYearRange();
    const deadline = end.toLocaleDateString("en-US", {
      timeZone: "UTC",
      month: "long",
      day: "numeric",
      year: "numeric",
    });

    const members = await db.user.findMany({
      where: { role: "member", emailVerifiedAt: { not: null }, deactivatedAt: null },
    });
    const baseUrl = await getPublicBaseUrl();

    for (const m of members) {
      try {
        const earned = await hoursEarnedForUser(m.id);
        await sendMail({
          to: m.email,
          ...hoursSummaryEmail(
            fullName(m),
            earned,
            hoursRemaining(earned, goal),
            goal,
            deadline,
            baseUrl,
          ),
        });
      } catch (err) {
        console.error(`[notify] hours summary to ${m.email} failed:`, err);
      }
    }
  });
}

export async function notifyNewRequest(
  eventTitle: string,
  requesterName: string,
): Promise<void> {
  await safeSend(async () => {
    const recipients = await verifiedEmailsByRole("officer");
    if (recipients.length === 0) return;
    const content = newRequestEmail(eventTitle, requesterName, await getPublicBaseUrl());
    for (const group of chunk(recipients, BCC_CHUNK)) {
      await sendMail({ bcc: group, ...content });
    }
  });
}

/** Yearly domain-renewal reminder to every verified, active officer. */
export async function notifyDomainRenewal(): Promise<void> {
  await safeSend(async () => {
    const recipients = await verifiedEmailsByRole("officer");
    if (recipients.length === 0) return;
    const content = domainRenewalEmail();
    for (const group of chunk(recipients, BCC_CHUNK)) {
      await sendMail({ bcc: group, ...content });
    }
  });
}

export async function notifyEventCancelled(
  userIds: number[],
  eventTitle: string,
): Promise<void> {
  if (userIds.length === 0) return;
  await safeSend(async () => {
    const users = await db.user.findMany({
      where: { id: { in: userIds }, emailVerifiedAt: { not: null }, deactivatedAt: null },
      select: { email: true },
    });
    const emails = users.map((u) => u.email);
    if (emails.length === 0) return;
    const content = eventCancelledEmail(eventTitle, await getPublicBaseUrl());
    for (const group of chunk(emails, BCC_CHUNK)) {
      await sendMail({ bcc: group, ...content });
    }
  });
}

export async function notifyWaitlistPromoted(
  userIds: number[],
  eventTitle: string,
  slotLabel: string,
): Promise<void> {
  if (userIds.length === 0) return;
  await safeSend(async () => {
    const baseUrl = await getPublicBaseUrl();
    for (const id of userIds) {
      const user = await db.user.findUnique({ where: { id } });
      if (!user?.emailVerifiedAt || user.deactivatedAt) continue;
      await sendMail({
        to: user.email,
        ...waitlistPromotedEmail(fullName(user), eventTitle, slotLabel, baseUrl),
      });
    }
  });
}

export async function notifyHourReportDecision(
  userId: number,
  description: string,
  hours: number,
  approved: boolean,
): Promise<void> {
  await safeSend(async () => {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt || user.deactivatedAt) return;
    await sendMail({
      to: user.email,
      ...hourReportDecisionEmail(
        fullName(user),
        description,
        hours,
        approved,
        await getPublicBaseUrl(),
      ),
    });
  });
}
