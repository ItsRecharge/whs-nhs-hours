import https from "node:https";
// @ts-expect-error node-fetch v2 ships no types; resolved at runtime (gaxios dep).
import nodeFetch from "node-fetch";
import { google, type sheets_v4 } from "googleapis";
import { getSheetsConfig, type SheetsConfig } from "./services/integration-service";

// gaxios (used by googleapis) defaults to the global `fetch`, which under the
// Next.js server runtime is a patched undici that aborts the OAuth token
// response mid-stream → "Premature close". Forcing gaxios to use node-fetch
// (its own bundled dependency) routes requests through Node's http stack and
// sidesteps the patched fetch entirely.
//
// keepAlive is OFF on purpose: on serverless/edge hosts the runtime freezes
// between invocations, so a pooled keep-alive socket goes dead and the next
// request reuses it → "Premature close". A fresh connection per request avoids
// that (the cost is one TLS handshake, negligible for our low call volume).
const httpsAgent = new https.Agent({ keepAlive: false });
// node-fetch v2's signature differs from the DOM `fetch`; gaxios only needs it
// to be callable, so cast to the shape gaxios expects.
const fetchImpl = nodeFetch as unknown as typeof fetch;

/** Retries a transient network failure a few times before giving up. */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
  throw lastErr;
}

export interface HoursRow {
  memberName: string;
  email?: string;
  hours: number;
  source: string; // e.g. "Event: Spring Concert"
  date: Date;
  recordedBy?: string; // officer who credited the hours
}

export interface RosterRow {
  name: string;
  email: string;
  gradYear: string; // "" when unknown
  hoursCompleted: number;
  remaining: number;
  events: string; // semicolon-joined list of sources
}

export interface SheetWriteResult {
  ok: boolean;
  error?: string;
  count: number;
}

const ROSTER_HEADER = [
  "Member",
  "Email",
  "Grad year",
  "Hours completed",
  "Hours remaining",
  "Events participated in",
];

let warned = false;

function client(config: SheetsConfig): sheets_v4.Sheets {
  const auth = new google.auth.JWT({
    email: config.serviceEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  // Pin the OAuth token request to node-fetch (avoids "Premature close").
  const transporter = auth.transporter as { defaults?: Record<string, unknown> };
  transporter.defaults = {
    ...transporter.defaults,
    fetchImplementation: fetchImpl,
    agent: httpsAgent,
  };
  // Same for the Sheets data requests.
  google.options({ fetchImplementation: fetchImpl, agent: httpsAgent } as never);
  return google.sheets({ version: "v4", auth });
}

/** Creates any of the given tabs that don't already exist in the spreadsheet. */
async function ensureTabsExist(
  sheets: sheets_v4.Sheets,
  spreadsheetId: string,
  tabs: string[],
): Promise<void> {
  const meta = await withRetry(() => sheets.spreadsheets.get({ spreadsheetId }));
  const existing = new Set(
    (meta.data.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[],
  );
  const missing = [...new Set(tabs)].filter((t) => !existing.has(t));
  if (missing.length === 0) return;
  await withRetry(() =>
    sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
      },
    }),
  );
}

function notConfigured(): void {
  if (!warned) {
    console.warn("[sheets] Google Sheets not configured — hours backup is a no-op.");
    warned = true;
  }
}

/**
 * Appends credited-hours rows to the configured Google Sheet's Log tab. No-ops
 * (with one log line) when Sheets isn't configured, and never throws into the
 * caller. Reads config from the DB (officer-editable) with env fallback.
 */
export async function appendHoursRows(rows: HoursRow[]): Promise<void> {
  if (rows.length === 0) return;
  const config = await getSheetsConfig();
  if (!config) {
    notConfigured();
    return;
  }

  try {
    const sheets = client(config);
    await ensureTabsExist(sheets, config.spreadsheetId, [config.logTab]);
    await withRetry(() =>
      sheets.spreadsheets.values.append({
        spreadsheetId: config.spreadsheetId,
        range: `${config.logTab}!A:F`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: rows.map((r) => [
            r.memberName,
            r.email ?? "",
            r.hours,
            r.source,
            r.date.toISOString().slice(0, 10),
            r.recordedBy ?? "",
          ]),
        },
      }),
    );
  } catch (err) {
    console.error("[sheets] append failed:", err);
  }
}

/**
 * Overwrites the Roster tab with a fresh snapshot: a header row plus one row per
 * member. This keeps the sheet a true live mirror regardless of what changed.
 * Returns a result so callers (e.g. the config-save verify path) can surface
 * success or failure; never throws.
 */
export async function syncRosterSheet(rows: RosterRow[]): Promise<SheetWriteResult> {
  const config = await getSheetsConfig();
  if (!config) {
    notConfigured();
    return { ok: false, error: "Google Sheets is not configured.", count: 0 };
  }

  try {
    const sheets = client(config);
    await ensureTabsExist(sheets, config.spreadsheetId, [config.rosterTab]);
    await withRetry(() =>
      sheets.spreadsheets.values.clear({
        spreadsheetId: config.spreadsheetId,
        range: `${config.rosterTab}!A:F`,
      }),
    );
    await withRetry(() =>
      sheets.spreadsheets.values.update({
        spreadsheetId: config.spreadsheetId,
        range: `${config.rosterTab}!A1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [
            ROSTER_HEADER,
            ...rows.map((r) => [
              r.name,
              r.email,
              r.gradYear,
              r.hoursCompleted,
              r.remaining,
              r.events,
            ]),
          ],
        },
      }),
    );
    return { ok: true, count: rows.length };
  } catch (err) {
    console.error("[sheets] roster sync failed:", err);
    return { ok: false, error: err instanceof Error ? err.message : String(err), count: 0 };
  }
}
