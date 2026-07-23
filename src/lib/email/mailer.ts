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
