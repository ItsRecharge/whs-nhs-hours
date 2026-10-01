import nodemailer from "nodemailer";
import { getMailConfig } from "@/lib/services/integration-service";

let warnedUnconfigured = false;

export interface MailMessage {
  to?: string;
  bcc?: string[];
  subject: string;
  html: string;
  text: string;
}

/**
 * Sends one email using the current mail config (DB-stored, env fallback).
 * Returns true if sent, false if mail is unconfigured. A fresh transport is
 * created per send so officer config changes take effect immediately. Throws
 * only on a genuine transport error — notify.ts swallows it.
 */
export async function sendMail(msg: MailMessage): Promise<boolean> {
  const config = await getMailConfig();
  if (!config) {
    if (!warnedUnconfigured) {
      console.warn("[mailer] No mail config (DB or env) — emails are no-ops.");
      warnedUnconfigured = true;
    }
    return false;
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: config.user, pass: config.pass },
  });

  await transport.sendMail({
    from: config.user, // Gmail rewrites From to the authenticated account anyway
    to: msg.to ?? config.user,
    bcc: msg.bcc,
    subject: msg.subject,
    html: msg.html,
    text: msg.text,
  });
  return true;
}

export interface BatchResult {
  unconfigured: boolean;
  sent: number;
  failed: string[];
}

// Gmail throttles bursts: many parallel logins, or too many recipients per
// message. Large sends go out as BCC batches over one connection, spaced out.
export const BATCH_SIZE = 50;
const BATCH_PAUSE_MS = 1000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends the same message to many recipients, automatically batched: BCC groups
 * of BATCH_SIZE, one at a time over a single SMTP connection with a short
 * pause between groups. Never throws; failures are logged and returned.
 */
export async function sendMailBatch(
  recipients: string[],
  content: Omit<MailMessage, "to" | "bcc">,
  pauseMs = BATCH_PAUSE_MS,
): Promise<BatchResult> {
  if (recipients.length === 0) return { unconfigured: false, sent: 0, failed: [] };
  const config = await getMailConfig();
  if (!config) {
    console.warn("[mailer] No mail config (DB or env) — batch not sent.");
    return { unconfigured: true, sent: 0, failed: [] };
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 1,
    auth: { user: config.user, pass: config.pass },
  });

  const failed: string[] = [];
  try {
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      if (i > 0) await sleep(pauseMs);
      const group = recipients.slice(i, i + BATCH_SIZE);
      try {
        const info = await transport.sendMail({
          from: config.user,
          to: config.user,
          bcc: group,
          ...content,
        });
        for (const r of (info.rejected ?? []) as (string | { address: string })[]) {
          const addr = typeof r === "string" ? r : r.address;
          console.error(`[mailer] batch recipient rejected: ${addr}`);
          failed.push(addr);
        }
      } catch (err) {
        console.error(`[mailer] batch of ${group.length} failed:`, err);
        failed.push(...group);
      }
    }
  } finally {
    transport.close();
  }
  return { unconfigured: false, sent: recipients.length - failed.length, failed };
}

/**
 * Sends personalized messages (one per recipient) over a single SMTP
 * connection, pausing after every BATCH_SIZE messages. Never throws.
 */
export async function sendMailEach(
  messages: (Omit<MailMessage, "to" | "bcc"> & { to: string })[],
  pauseMs = BATCH_PAUSE_MS,
): Promise<BatchResult> {
  if (messages.length === 0) return { unconfigured: false, sent: 0, failed: [] };
  const config = await getMailConfig();
  if (!config) {
    console.warn("[mailer] No mail config (DB or env) — batch not sent.");
    return { unconfigured: true, sent: 0, failed: [] };
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    pool: true,
    maxConnections: 1,
    auth: { user: config.user, pass: config.pass },
  });

  const failed: string[] = [];
  try {
    for (const [i, msg] of messages.entries()) {
      if (i > 0 && i % BATCH_SIZE === 0) await sleep(pauseMs);
      try {
        await transport.sendMail({ from: config.user, ...msg });
      } catch (err) {
        console.error(`[mailer] send to ${msg.to} failed:`, err);
        failed.push(msg.to);
      }
    }
  } finally {
    transport.close();
  }
  return { unconfigured: false, sent: messages.length - failed.length, failed };
}
