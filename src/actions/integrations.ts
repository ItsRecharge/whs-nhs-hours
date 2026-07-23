"use server";

import bcrypt from "bcryptjs";
import { requireUser } from "@/lib/current-user";
import {
  updateMailConfig,
  updateSheetsConfig,
  isSheetsConfigured,
} from "@/lib/services/integration-service";
import { syncRosterNow } from "@/lib/services/sheet-sync-service";
import { recordAudit } from "@/lib/services/audit-service";

export interface IntegrationFormState {
  error?: string;
  success?: string;
}

async function verifyOfficerPassword(password: string) {
  const officer = await requireUser("officer");
  const ok = await bcrypt.compare(password, officer.passwordHash);
  return ok ? officer : null;
}

export async function updateMailAction(
  _prev: IntegrationFormState,
  formData: FormData,
): Promise<IntegrationFormState> {
  const officer = await verifyOfficerPassword(String(formData.get("password") ?? ""));
  if (!officer) return { error: "Incorrect password." };

  const user = String(formData.get("gmailUser") ?? "").trim();
  const appPassword = String(formData.get("gmailAppPassword") ?? "").trim();
  if (!user || !appPassword) {
    return { error: "Both the Gmail address and app password are required." };
  }

  await updateMailConfig({ user, appPassword });
  await recordAudit({
    actor: officer,
    action: "integration.email",
    summary: `Updated email (Gmail) config — ${user}`,
  });
  return { success: "Email settings saved." };
}

export async function updateSheetsAction(
  _prev: IntegrationFormState,
  formData: FormData,
): Promise<IntegrationFormState> {
  const officer = await verifyOfficerPassword(String(formData.get("password") ?? ""));
  if (!officer) return { error: "Incorrect password." };

  const spreadsheetId = String(formData.get("sheetsSpreadsheetId") ?? "").trim();
  const rosterTab = String(formData.get("sheetsRosterTab") ?? "").trim();
  const logTab = String(formData.get("sheetsLogTab") ?? "").trim();
  if (!spreadsheetId) {
    return { error: "Spreadsheet ID is required." };
  }

  // Credentials come from an uploaded service-account JSON key file. When editing
  // an already-configured integration, the file is optional — omit it to keep the
  // stored service account and change only the spreadsheet ID / tab names.
  const file = formData.get("sheetsJson");
  let serviceEmail: string | undefined;
  let privateKey: string | undefined;
  if (file instanceof File && file.size > 0) {
    try {
      const json = JSON.parse(await file.text());
      serviceEmail = String(json.client_email ?? "").trim();
      privateKey = String(json.private_key ?? "").trim();
      if (!serviceEmail || !privateKey) throw new Error("missing fields");
    } catch {
      return {
        error:
          "That doesn't look like a valid service-account JSON key file (missing client_email / private_key).",
      };
    }
  } else if (!(await isSheetsConfigured())) {
    return { error: "Upload the service-account JSON key file from Google Cloud." };
  }

  await updateSheetsConfig({ spreadsheetId, serviceEmail, privateKey, rosterTab, logTab });
  await recordAudit({
    actor: officer,
    action: "integration.sheets",
    summary: `Updated Google Sheets backup config (${spreadsheetId})`,
  });

  // Write the roster now so saving doubles as a live connection test.
  const result = await syncRosterNow();
  if (!result.ok) {
    return {
      error: `Settings saved, but the test write failed: ${result.error}. Check the spreadsheet ID, that the sheet is shared with the service account as Editor, and the tab names.`,
    };
  }
  return {
    success: `Google Sheets settings saved — wrote ${result.count} member(s) to the roster tab.`,
  };
}
