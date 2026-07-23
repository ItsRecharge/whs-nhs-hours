import { chromium } from "playwright";
import fs from "node:fs";

const BASE = "http://localhost:3000";
const OUT = "docs/user-guide/img";
const INVITE = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });

const VIEWPORT = { width: 1280, height: 900 };

async function shot(page, path, file) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${file}.png`, fullPage: true });
  console.log(`  ✓ ${file}  (${path})`);
}

async function login(context, email, password, expectPath) {
  const page = await context.newPage();
  await page.goto(BASE + "/login", { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await Promise.all([
    page.waitForURL(`**${expectPath}**`, { timeout: 15000 }),
    page.click('button[type="submit"]'),
  ]);
  console.log(`  logged in: ${email} -> ${page.url()}`);
  return page;
}

const browser = await chromium.launch();

// ---- Public / auth pages (no session) ----
console.log("Public pages:");
{
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await ctx.newPage();
  await shot(page, "/", "01-landing");
  await shot(page, "/login", "02-login");
  await shot(page, `/signup?invite=${INVITE}`, "03-signup");
  await shot(page, "/forgot-password", "04-forgot-password");
  await ctx.close();
}

// ---- Member pages ----
console.log("Member pages:");
{
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await login(ctx, "member1@demo.local", "MemberDemo1!", "/member");
  await shot(page, "/member/dashboard", "member-01-dashboard");
  await shot(page, "/member/events", "member-02-events");
  await shot(page, "/member/history", "member-03-history");
  await shot(page, "/member/report-hours", "member-04-report-hours");
  await shot(page, "/member/request-event", "member-05-request-event");
  await shot(page, "/settings", "member-06-settings");
  await ctx.close();
}

// ---- Officer pages ----
console.log("Officer pages:");
{
  const ctx = await browser.newContext({ viewport: VIEWPORT });
  const page = await login(ctx, "officer@demo.local", "OfficerDemo1!", "/officer");
  await shot(page, "/officer/dashboard", "officer-01-dashboard");
  await shot(page, "/officer/events", "officer-02-events");
  await shot(page, "/officer/events/1/attendance", "officer-03-attendance");
  await shot(page, "/officer/events/1/edit", "officer-04-event-edit");
  await shot(page, "/officer/requests", "officer-05-requests");
  await shot(page, "/officer/members", "officer-06-members");
  await shot(page, "/officer/members/2", "officer-07-member-detail");
  await shot(page, "/officer/invites", "officer-08-invites");
  await shot(page, "/officer/admin", "officer-09-admin");
  await shot(page, "/officer/chapter", "officer-10-chapter");
  await shot(page, "/officer/integrations", "officer-11-integrations");
  await shot(page, "/officer/audit", "officer-12-audit");
  await shot(page, "/officer/reset", "officer-13-reset");
  await ctx.close();
}

await browser.close();
console.log("Done.");
