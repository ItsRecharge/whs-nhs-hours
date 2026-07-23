import { db } from "../db";
import { decryptSecret, encryptSecret } from "../crypto-secret";

// Optional integration env vars are read directly (not via the cached getEnv)
// so officer/runtime changes and tests see current values.
function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : undefined;
}

// Integration config: DB (officer-editable, encrypted secrets) overrides env,
// which remains a fallback so local dev and existing deployments keep working.

async function settings() {
  return db.integrationSettings.findUnique({ where: { id: 1 } });
}

export interface MailConfig {
  user: string;
  pass: string;
}

export async function getMailConfig(): Promise<MailConfig | null> {
  const s = await settings();
  const dbUser = s?.gmailUser?.trim();
  const dbPass = decryptSecret(s?.gmailAppPasswordEnc);
  if (dbUser && dbPass) return { user: dbUser, pass: dbPass };

  const envUser = env("GMAIL_USER");
  const envPass = env("GMAIL_APP_PASSWORD");
  if (envUser && envPass) return { user: envUser, pass: envPass };
  return null;
}

export async function isMailConfigured(): Promise<boolean> {
  return (await getMailConfig()) !== null;
}

/** Accepts a base64-encoded or raw (literal \n) private key and normalizes it. */
function decodeKey(raw: string): string {
  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    if (decoded.includes("PRIVATE KEY")) return decoded;
  } catch {
    /* fall through */
  }
  return raw.replace(/\\n/g, "\n");
}

export interface SheetsConfig {
  spreadsheetId: string;
  serviceEmail: string;
  privateKey: string;
  rosterTab: string;
  logTab: string;
}

const DEFAULT_ROSTER_TAB = "Roster";
const DEFAULT_LOG_TAB = "Log";

export async function getSheetsConfig(): Promise<SheetsConfig | null> {
  const s = await settings();
  const rosterTab = s?.sheetsRosterTab?.trim() || DEFAULT_ROSTER_TAB;
  const logTab = s?.sheetsLogTab?.trim() || DEFAULT_LOG_TAB;

  const id = s?.sheetsSpreadsheetId?.trim();
  const email = s?.sheetsServiceEmail?.trim();
  const keyRaw = decryptSecret(s?.sheetsPrivateKeyEnc);
  if (id && email && keyRaw) {
    return {
      spreadsheetId: id,
      serviceEmail: email,
      privateKey: decodeKey(keyRaw),
      rosterTab,
      logTab,
    };
  }

  const envId = env("GOOGLE_SHEETS_SPREADSHEET_ID");
  const envEmail = env("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const envKey = env("GOOGLE_SERVICE_ACCOUNT_KEY");
  if (envId && envEmail && envKey) {
    return {
      spreadsheetId: envId,
      serviceEmail: envEmail,
      privateKey: decodeKey(envKey),
      rosterTab,
      logTab,
    };
  }
  return null;
}

export async function isSheetsConfigured(): Promise<boolean> {
  return (await getSheetsConfig()) !== null;
}

/** A masked view for the UI — never returns the stored secrets. */
export async function getIntegrationStatus() {
  const s = await settings();
  return {
    gmailUser: s?.gmailUser ?? env("GMAIL_USER") ?? "",
    mailConfigured: await isMailConfigured(),
    mailFromDb: Boolean(s?.gmailUser && s?.gmailAppPasswordEnc),
    sheetsSpreadsheetId: s?.sheetsSpreadsheetId ?? env("GOOGLE_SHEETS_SPREADSHEET_ID") ?? "",
    sheetsServiceEmail: s?.sheetsServiceEmail ?? env("GOOGLE_SERVICE_ACCOUNT_EMAIL") ?? "",
    sheetsRosterTab: s?.sheetsRosterTab?.trim() || DEFAULT_ROSTER_TAB,
    sheetsLogTab: s?.sheetsLogTab?.trim() || DEFAULT_LOG_TAB,
    sheetsConfigured: await isSheetsConfigured(),
    sheetsFromDb: Boolean(s?.sheetsSpreadsheetId && s?.sheetsPrivateKeyEnc),
  };
}

export async function updateMailConfig(input: {
  user: string;
  appPassword: string;
}): Promise<void> {
  await db.integrationSettings.upsert({
    where: { id: 1 },
    update: {
      gmailUser: input.user,
      gmailAppPasswordEnc: encryptSecret(input.appPassword),
    },
    create: {
      id: 1,
      gmailUser: input.user,
      gmailAppPasswordEnc: encryptSecret(input.appPassword),
    },
  });
}

export async function updateSheetsConfig(input: {
  spreadsheetId: string;
  // Credentials are optional: omit them to keep the stored service account
  // (e.g. when an officer edits only the spreadsheet ID or tab names).
  serviceEmail?: string;
  privateKey?: string;
  rosterTab?: string;
  logTab?: string;
}): Promise<void> {
  const rosterTab = input.rosterTab?.trim() || DEFAULT_ROSTER_TAB;
  const logTab = input.logTab?.trim() || DEFAULT_LOG_TAB;
  const creds =
    input.serviceEmail && input.privateKey
      ? {
          sheetsServiceEmail: input.serviceEmail,
          sheetsPrivateKeyEnc: encryptSecret(input.privateKey),
        }
      : {};
  await db.integrationSettings.upsert({
    where: { id: 1 },
    update: {
      sheetsSpreadsheetId: input.spreadsheetId,
      sheetsRosterTab: rosterTab,
      sheetsLogTab: logTab,
      ...creds,
    },
    create: {
      id: 1,
      sheetsSpreadsheetId: input.spreadsheetId,
      sheetsRosterTab: rosterTab,
      sheetsLogTab: logTab,
      ...creds,
    },
  });
}
