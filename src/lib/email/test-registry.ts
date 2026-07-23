import type { EmailContent } from "./templates";
import * as t from "./templates";

export interface TemplateField {
  name: string;
  label: string;
  default: string;
}

export interface TemplateEntry {
  label: string;
  fields: TemplateField[];
  build: (values: Record<string, string>) => EmailContent;
}

const SAMPLE_TOKEN = "sample-token-1234567890";

function bool(v: string | undefined): boolean {
  return v === "true" || v === "yes" || v === "1";
}

function num(v: string | undefined, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function days(n: number): Date {
  return new Date(Date.now() + n * 24 * 60 * 60 * 1000);
}

/**
 * Drives the officer email-test page: each entry knows the sample fields to
 * render and how to rebuild the real template in src/lib/email/templates.ts.
 */
export const TEST_TEMPLATES: Record<string, TemplateEntry> = {
  verification: {
    label: "Account verification",
    fields: [{ name: "name", label: "Name", default: "Alex Member" }],
    build: (v) => t.verificationEmail(v.name, SAMPLE_TOKEN),
  },
  email_change: {
    label: "Email change confirmation",
    fields: [{ name: "name", label: "Name", default: "Alex Member" }],
    build: (v) => t.emailChangeEmail(v.name, SAMPLE_TOKEN),
  },
  password_reset: {
    label: "Password reset",
    fields: [{ name: "name", label: "Name", default: "Alex Member" }],
    build: (v) => t.passwordResetEmail(v.name, SAMPLE_TOKEN),
  },
  invite: {
    label: "Chapter invite",
    fields: [],
    build: () =>
      t.inviteEmail(
        "https://example.com/signup?token=sample",
        days(7),
        "An officer",
        "Aberjona NHS Chapter",
      ),
  },
  event_posted: {
    label: "New event posted",
    fields: [
      { name: "title", label: "Event title", default: "Spring Concert Setup" },
      { name: "when", label: "When", default: "Sat, May 3 · 9:00 AM" },
    ],
    build: (v) => t.eventPostedEmail(v.title, v.when),
  },
  request_decision: {
    label: "Event request decision",
    fields: [
      { name: "title", label: "Event title", default: "Community Cleanup" },
      { name: "approved", label: "Approved? (true/false)", default: "true" },
    ],
    build: (v) => t.requestDecisionEmail(v.title, bool(v.approved)),
  },
  hours_credited: {
    label: "Hours credited",
    fields: [
      { name: "name", label: "Name", default: "Alex Member" },
      { name: "hours", label: "Hours", default: "3" },
      { name: "title", label: "Event title", default: "Spring Concert Setup" },
    ],
    build: (v) => t.hoursCreditedEmail(v.name, num(v.hours, 3), v.title),
  },
  hours_summary: {
    label: "Hours summary / reminder",
    fields: [
      { name: "name", label: "Name", default: "Alex Member" },
      { name: "earned", label: "Earned", default: "12" },
      { name: "remaining", label: "Remaining", default: "8" },
      { name: "goal", label: "Goal", default: "20" },
      { name: "deadline", label: "Deadline label", default: "June 1" },
    ],
    build: (v) =>
      t.hoursSummaryEmail(
        v.name,
        num(v.earned, 12),
        num(v.remaining, 8),
        num(v.goal, 20),
        v.deadline,
      ),
  },
  new_request: {
    label: "New event request (officer)",
    fields: [
      { name: "title", label: "Event title", default: "Community Cleanup" },
      { name: "requester", label: "Requester name", default: "Alex Member" },
    ],
    build: (v) => t.newRequestEmail(v.title, v.requester),
  },
  event_cancelled: {
    label: "Event cancelled",
    fields: [
      { name: "title", label: "Event title", default: "Spring Concert Setup" },
    ],
    build: (v) => t.eventCancelledEmail(v.title),
  },
  waitlist_promoted: {
    label: "Waitlist promoted",
    fields: [
      { name: "name", label: "Name", default: "Alex Member" },
      { name: "title", label: "Event title", default: "Spring Concert Setup" },
      { name: "slot", label: "Slot label", default: "9:00 AM – 12:00 PM" },
    ],
    build: (v) => t.waitlistPromotedEmail(v.name, v.title, v.slot),
  },
  hour_report_decision: {
    label: "Hour report decision",
    fields: [
      { name: "name", label: "Name", default: "Alex Member" },
      { name: "description", label: "Description", default: "Tutoring at library" },
      { name: "hours", label: "Hours", default: "2" },
      { name: "approved", label: "Approved? (true/false)", default: "true" },
    ],
    build: (v) =>
      t.hourReportDecisionEmail(
        v.name,
        v.description,
        num(v.hours, 2),
        bool(v.approved),
      ),
  },
};

export type TemplateKey = keyof typeof TEST_TEMPLATES;
