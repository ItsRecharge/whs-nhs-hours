import Link from "next/link";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { resetSummary, resetPhrase } from "@/lib/services/reset-service";
import { yearEndResetAction } from "@/actions/reset";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

export default async function YearEndResetPage() {
  await requireUser("officer");
  const summary = await resetSummary();
  const phrase = resetPhrase(summary.members);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <Link
          href="/officer/admin"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to admin
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Year-end reset</h1>
      </div>

      <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">This permanently deletes:</p>
          <ul className="mt-1 list-disc pl-5">
            <li>{summary.members} members (officers are kept)</li>
            <li>{summary.events} events &amp; {summary.signups} sign-ups</li>
            <li>{summary.reports} hour reports</li>
            <li>{summary.invites} invite links</li>
          </ul>
          <p className="mt-2">
            Chapter settings, integrations, and the audit log are kept. There is no
            undo — back up the database file first.
          </p>
        </div>
      </div>

      <form action={yearEndResetAction} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        <div>
          <label htmlFor="confirmPhrase" className={label}>
            Type <code className="rounded bg-gray-100 px-1.5 py-0.5">{phrase}</code> to
            confirm
          </label>
          <input
            id="confirmPhrase"
            name="confirmPhrase"
            autoComplete="off"
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor="password" className={label}>
            Your password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className={field}
          />
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-700">
          <input type="checkbox" name="acknowledge" className="mt-0.5 h-4 w-4" required />
          I understand this is irreversible and have a database backup.
        </label>
        <button
          type="submit"
          className="w-full rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          Permanently reset for the new year
        </button>
        <SubmitButtonNote />
      </form>
    </div>
  );
}

// Small inline note rendered under the destructive button.
function SubmitButtonNote() {
  return (
    <p className="text-center text-xs text-gray-400">
      All three fields must be correct; the count is re-checked on the server.
    </p>
  );
}
