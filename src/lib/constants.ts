// SQLite (via Prisma) has no native enums, so these const unions are the
// source of truth for the String columns in prisma/schema.prisma.

export const ROLES = ["member", "officer", "organizer"] as const;
export type Role = (typeof ROLES)[number];

// "outside" is the only category that counts as outside hours (capped by
// ChapterSettings.outsideHoursCap); every other category is inside.
export const HOUR_CATEGORIES = [
  "inside",
  "outside",
  "tutoring",
  "soup_kitchen",
  "gardening",
] as const;
export type HourCategory = (typeof HOUR_CATEGORIES)[number];

/** NHS events are always inside hours. */
export const EVENT_CATEGORIES = HOUR_CATEGORIES.filter(
  (c): c is Exclude<HourCategory, "outside"> => c !== "outside",
);

export const HOUR_CATEGORY_LABELS: Record<HourCategory, string> = {
  inside: "Inside",
  outside: "Outside",
  tutoring: "Tutoring",
  soup_kitchen: "Soup Kitchen",
  gardening: "Gardening",
};

export const HOUR_ORIGINS = ["inside", "outside"] as const;
export type HourOrigin = (typeof HOUR_ORIGINS)[number];

export const SHARE_LINK_KINDS = ["roster", "attendance"] as const;
export type ShareLinkKind = (typeof SHARE_LINK_KINDS)[number];

export const EVENT_STATUSES = [
  "active",
  "completed",
  "pending_approval",
  "cancelled",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const TOKEN_TYPES = [
  "email_verification",
  "password_reset",
  "email_change",
] as const;
export type TokenType = (typeof TOKEN_TYPES)[number];

export const SIGNUP_STATUSES = ["confirmed", "waitlisted"] as const;
export type SignupStatus = (typeof SIGNUP_STATUSES)[number];

export const REPORT_STATUSES = ["pending", "approved", "denied"] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const SESSION_COOKIE = "nhs_session";
export const FLASH_COOKIE = "nhs_flash";
export const OPS_GRANT_COOKIE = "nhs_ops_grant";
// Holds the bootstrap officer's own session token while they impersonate someone,
// so "stop impersonating" can restore it.
export const IMPERSONATOR_COOKIE = "nhs_impersonator";

export const VERIFICATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000; // 48h
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
export const OPS_GRANT_TTL_SECONDS = 10 * 60; // 10 min
export const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 days

// Students (member-role signups) must use their school Google account.
export const STUDENT_EMAIL_DOMAIN = "wpsstudent.com";
