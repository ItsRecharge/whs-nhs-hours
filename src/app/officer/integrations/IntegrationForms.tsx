"use client";

import { useActionState } from "react";
import {
  updateMailAction,
  updateSheetsAction,
  type IntegrationFormState,
} from "@/actions/integrations";
import { SubmitButton } from "@/components/SubmitButton";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

function Feedback({ state }: { state: IntegrationFormState }) {
  if (state.error)
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
        {state.error}
      </div>
    );
  if (state.success)
    return (
      <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
        {state.success}
      </div>
    );
  return null;
}

function StatusPill({ configured }: { configured: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        configured ? "bg-green-100 text-green-800" : "bg-gray-200 text-gray-600"
      }`}
    >
      {configured ? "Configured" : "Not set"}
    </span>
  );
}

export function MailForm({
  gmailUser,
  configured,
}: {
  gmailUser: string;
  configured: boolean;
}) {
  const [state, action] = useActionState<IntegrationFormState, FormData>(
    updateMailAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Email (Gmail)</h2>
        <StatusPill configured={configured} />
      </div>
      <Feedback state={state} />
      <div>
        <label htmlFor="gmailUser" className={label}>
          Gmail address
        </label>
        <input
          id="gmailUser"
          name="gmailUser"
          type="email"
          defaultValue={gmailUser}
          required
          className={field}
        />
      </div>
      <div>
        <label htmlFor="gmailAppPassword" className={label}>
          App password
        </label>
        <input
          id="gmailAppPassword"
          name="gmailAppPassword"
          type="password"
          placeholder={configured ? "•••••••• (stored — enter to replace)" : ""}
          required
          className={field}
        />
        <p className="mt-1 text-xs text-gray-500">
          From Google Account → Security → App passwords (needs 2-Step Verification).
        </p>
      </div>
      <div>
        <label htmlFor="password" className={label}>
          Confirm with your password
        </label>
        <input id="password" name="password" type="password" required className={field} />
      </div>
      <SubmitButton pendingText="Saving…">Save Email Settings</SubmitButton>
    </form>
  );
}

export function SheetsForm({
  spreadsheetId,
  serviceEmail,
  rosterTab,
  logTab,
  configured,
}: {
  spreadsheetId: string;
  serviceEmail: string;
  rosterTab: string;
  logTab: string;
  configured: boolean;
}) {
  const [state, action] = useActionState<IntegrationFormState, FormData>(
    updateSheetsAction,
    {},
  );
  return (
    <form action={action} encType="multipart/form-data" className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Google Sheets backup</h2>
        <StatusPill configured={configured} />
      </div>
      <Feedback state={state} />
      <div>
        <label htmlFor="sheetsSpreadsheetId" className={label}>
          Spreadsheet ID
        </label>
        <input
          id="sheetsSpreadsheetId"
          name="sheetsSpreadsheetId"
          defaultValue={spreadsheetId}
          required
          className={field}
        />
      </div>
      <div>
        <label htmlFor="sheetsJson" className={label}>
          Service-account JSON key file
        </label>
        <input
          id="sheetsJson"
          name="sheetsJson"
          type="file"
          accept="application/json,.json"
          className="mt-1 block w-full text-sm text-gray-700 file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
        />
        <p className="mt-1 text-xs text-gray-500">
          Upload the service-account JSON key file from Google Cloud. Share the
          spreadsheet with that account&apos;s email (Editor).
          {configured && serviceEmail ? (
            <>
              {" "}
              Current account: <span className="font-medium">{serviceEmail}</span>.
              Leave this empty to keep it.
            </>
          ) : null}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="sheetsRosterTab" className={label}>
            Roster tab name
          </label>
          <input
            id="sheetsRosterTab"
            name="sheetsRosterTab"
            defaultValue={rosterTab}
            placeholder="Roster"
            className={field}
          />
        </div>
        <div>
          <label htmlFor="sheetsLogTab" className={label}>
            Log tab name
          </label>
          <input
            id="sheetsLogTab"
            name="sheetsLogTab"
            defaultValue={logTab}
            placeholder="Log"
            className={field}
          />
        </div>
        <p className="col-span-2 -mt-1 text-xs text-gray-500">
          Which tabs to write to. They&apos;ll be created automatically if missing. The
          Roster tab is a live snapshot of every member; the Log tab keeps an append-only
          history of credited hours.
        </p>
      </div>
      <div>
        <label htmlFor="sheetsPassword" className={label}>
          Confirm with your password
        </label>
        <input
          id="sheetsPassword"
          name="password"
          type="password"
          required
          className={field}
        />
      </div>
      <SubmitButton pendingText="Saving…">Save Sheets Settings</SubmitButton>
    </form>
  );
}
