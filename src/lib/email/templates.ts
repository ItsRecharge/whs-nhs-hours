import { getEnv } from "@/lib/env";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

function appUrl(): string {
  return getEnv().APP_URL.replace(/\/$/, "");
}

/** Cloudflare registration page for the chapter domain. */
export const RENEWAL_URL =
  "https://dash.cloudflare.com/fe4e8ca3c07a7eeee80feff9bff4e5c7/domains/registrations/wpsmusicdep.com";
/** Shared Google account used to sign into Cloudflare ("Sign in with Google"). */
export const SIGN_IN_EMAIL = "Winchestertri.m@gmail.com";

/** Standard subject prefix for every email: "NHS Hours - <specific>". */
function subject(specific: string): string {
  return `NHS Hours - ${specific}`;
}

function layout(heading: string, bodyHtml: string, cta?: { label: string; url: string }) {
  const button = cta
    ? `<a href="${cta.url}" style="display:inline-block;background:#1d4fa3;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;font-size:14px;margin:18px 0;">${cta.label}</a>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f5f7f9;font-family:'Segoe UI',system-ui,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <div style="background:linear-gradient(135deg,#0d2c6b,#3a6fc4);border-radius:14px 14px 0 0;padding:22px 28px;">
      <span style="color:#fff;font-weight:800;letter-spacing:1px;font-size:14px;">★ NHS HOURS LOG</span>
    </div>
    <div style="background:#fff;border-radius:0 0 14px 14px;padding:28px;">
      <h1 style="font-size:19px;color:#0d2c6b;margin:0 0 12px;">${heading}</h1>
      <div style="font-size:14px;color:#374151;line-height:1.6;">${bodyHtml}</div>
      ${button}
    </div>
    <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">National Honor Society — Hours Log</p>
  </div></body></html>`;
}

export function verificationEmail(
  name: string,
  token: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/verify-email?token=${token}`;
  return {
    subject: subject("Verify your email"),
    html: layout(
      `Welcome, ${name}!`,
      `<p>Confirm your email address to activate your chapter account. This link expires in 48 hours.</p>`,
      { label: "Verify Email", url },
    ),
    text: `Welcome, ${name}!\n\nVerify your email to activate your account (expires in 48 hours):\n${url}`,
  };
}

export function emailChangeEmail(
  name: string,
  token: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/verify-email-change?token=${token}`;
  return {
    subject: subject("Confirm your new email"),
    html: layout(
      `Confirm your new email`,
      `<p>Hi ${name}, confirm this address to make it the new sign-in email for your account. This link expires in 48 hours. If you didn't request this, you can ignore it — your current email stays in place.</p>`,
      { label: "Confirm New Email", url },
    ),
    text: `Hi ${name}, confirm this address to make it your new sign-in email (expires in 48 hours):\n${url}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function passwordResetEmail(
  name: string,
  token: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/reset-password?token=${token}`;
  return {
    subject: subject("Reset your password"),
    html: layout(
      `Password reset`,
      `<p>Hi ${name}, we received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>`,
      { label: "Reset Password", url },
    ),
    text: `Hi ${name},\n\nReset your password (expires in 1 hour):\n${url}\n\nIf you didn't request this, ignore this email.`,
  };
}

export function inviteEmail(
  link: string,
  expiresAt: Date,
  inviterName: string,
  chapterName: string,
): EmailContent {
  return {
    subject: subject(`You're invited to ${chapterName}`),
    html: layout(
      `You've been invited`,
      `<p><strong>${inviterName}</strong> invited you to create an account for <strong>${chapterName}</strong>. Use the link below to get started. The invite expires on ${expiresAt.toLocaleDateString()}.</p>`,
      { label: "Create Your Account", url: link },
    ),
    text: `${inviterName} invited you to create an account for ${chapterName}.\n\nCreate your account (expires ${expiresAt.toLocaleDateString()}):\n${link}`,
  };
}

export function eventPostedEmail(
  eventTitle: string,
  whenLabel: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/events`;
  return {
    subject: subject(`New event: ${eventTitle}`),
    html: layout(
      `New event posted`,
      `<p><strong>${eventTitle}</strong> is now open for sign-ups.</p><p>When: ${whenLabel}</p>`,
      { label: "View &amp; Sign Up", url },
    ),
    text: `New event posted: ${eventTitle}\nWhen: ${whenLabel}\n\nSign up: ${url}`,
  };
}

export function requestDecisionEmail(
  eventTitle: string,
  approved: boolean,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/dashboard`;
  return approved
    ? {
        subject: subject(`Event request approved: ${eventTitle}`),
        html: layout(
          `Request approved`,
          `<p>Your requested event <strong>${eventTitle}</strong> has been approved and is now active for sign-ups.</p>`,
          { label: "View Dashboard", url },
        ),
        text: `Your event request "${eventTitle}" was approved and is now active.\n${url}`,
      }
    : {
        subject: subject(`Event request update: ${eventTitle}`),
        html: layout(
          `Request not approved`,
          `<p>Your requested event <strong>${eventTitle}</strong> was not approved. Reach out to an officer if you have questions.</p>`,
          { label: "View Dashboard", url },
        ),
        text: `Your event request "${eventTitle}" was not approved.\n${url}`,
      };
}

export function hoursCreditedEmail(
  name: string,
  hours: number,
  eventTitle: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/dashboard`;
  return {
    subject: subject(`${hours} service hours credited`),
    html: layout(
      `Hours credited`,
      `<p>Hi ${name}, you've been credited <strong>${hours} hour${hours === 1 ? "" : "s"}</strong> for attending <strong>${eventTitle}</strong>.</p>`,
      { label: "View Your Progress", url },
    ),
    text: `Hi ${name}, you've been credited ${hours} hour(s) for attending ${eventTitle}.\n${url}`,
  };
}

export function hoursSummaryEmail(
  name: string,
  earned: number,
  remaining: number,
  goal: number,
  deadlineLabel: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/events`;
  if (remaining <= 0) {
    return {
      subject: subject("You've completed your service hours 🎉"),
      html: layout(
        `You're all set, ${name}!`,
        `<p>You've earned <strong>${earned} of ${goal}</strong> service hours this year — goal met. Thank you for your service!</p>`,
        { label: "View Your Hours", url: `${baseUrl}/member/dashboard` },
      ),
      text: `You're all set, ${name}! You've earned ${earned} of ${goal} hours — goal met. Thank you!`,
    };
  }
  return {
    subject: subject(`Service hours reminder — ${remaining} to go`),
    html: layout(
      `Hours reminder for ${name}`,
      `<p>You've earned <strong>${earned} of ${goal}</strong> service hours so far. You still need <strong>${remaining} more</strong> before <strong>${deadlineLabel}</strong>.</p><p>Browse upcoming events to sign up and finish your hours.</p>`,
      { label: "Find Events", url },
    ),
    text: `Hi ${name}, you've earned ${earned} of ${goal} hours. You need ${remaining} more before ${deadlineLabel}.\nFind events: ${url}`,
  };
}

export function newRequestEmail(
  eventTitle: string,
  requesterName: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/officer/requests`;
  return {
    subject: subject(`New event request: ${eventTitle}`),
    html: layout(
      `New event request`,
      `<p><strong>${requesterName}</strong> submitted a new event request: <strong>${eventTitle}</strong>. Review it to approve or deny.</p>`,
      { label: "Review Requests", url },
    ),
    text: `${requesterName} requested a new event: ${eventTitle}\nReview: ${url}`,
  };
}

export function eventCancelledEmail(
  eventTitle: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/events`;
  return {
    subject: subject(`Event cancelled: ${eventTitle}`),
    html: layout(
      `Event cancelled`,
      `<p>Unfortunately <strong>${eventTitle}</strong> has been cancelled. You no longer need to attend. Check the events page for other ways to earn hours.</p>`,
      { label: "View Events", url },
    ),
    text: `${eventTitle} has been cancelled.\nOther events: ${url}`,
  };
}

export function waitlistPromotedEmail(
  name: string,
  eventTitle: string,
  slotLabel: string,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/events`;
  return {
    subject: subject(`A spot opened up: ${eventTitle}`),
    html: layout(
      `You're off the waitlist`,
      `<p>Hi ${name}, a spot opened up and you're now <strong>confirmed</strong> for <strong>${eventTitle}</strong> (${slotLabel}).</p>`,
      { label: "View Event", url },
    ),
    text: `Hi ${name}, you're now confirmed for ${eventTitle} (${slotLabel}).\n${url}`,
  };
}

export function hourReportDecisionEmail(
  name: string,
  description: string,
  hours: number,
  approved: boolean,
  baseUrl: string = appUrl(),
): EmailContent {
  const url = `${baseUrl}/member/report-hours`;
  return approved
    ? {
        subject: subject(`Hour report approved (${hours} hrs)`),
        html: layout(
          `Hours approved`,
          `<p>Hi ${name}, your reported hours for <strong>${description}</strong> were approved and <strong>${hours} hour${hours === 1 ? "" : "s"}</strong> added to your total.</p>`,
          { label: "View Your Reports", url },
        ),
        text: `Hi ${name}, your report "${description}" was approved (${hours} hrs).\n${url}`,
      }
    : {
        subject: subject("Hour report update"),
        html: layout(
          `Hours not approved`,
          `<p>Hi ${name}, your reported hours for <strong>${description}</strong> were not approved. Reach out to an officer with questions.</p>`,
          { label: "View Your Reports", url },
        ),
        text: `Hi ${name}, your report "${description}" was not approved.\n${url}`,
      };
}

export function domainRenewalEmail(
  renewalUrl: string = RENEWAL_URL,
  signInEmail: string = SIGN_IN_EMAIL,
): EmailContent {
  const body =
    `<p>The chapter's website domain <strong>wpsmusicdep.com</strong> is due for its yearly renewal. ` +
    `Please renew it through Cloudflare so the site stays online.</p>` +
    `<p>Sign in to Cloudflare with <strong>${signInEmail}</strong> using <strong>"Sign in with Google"</strong>, ` +
    `then complete the renewal on the registration page.</p>`;
  return {
    subject: subject("Renew the chapter domain"),
    html: layout("Domain renewal reminder", body, { label: "Renew domain", url: renewalUrl }),
    text:
      `The chapter domain wpsmusicdep.com is due for renewal.\n\n` +
      `Sign in to Cloudflare with ${signInEmail} using "Sign in with Google", then renew it here:\n${renewalUrl}`,
  };
}
