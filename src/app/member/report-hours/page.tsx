import { requireUser } from "@/lib/current-user";
import { listReportsForUser } from "@/lib/services/hour-report-service";
import { reportHoursAction } from "@/actions/hour-reports";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEventDate } from "@/lib/format";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

const REPORT_BADGE: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  denied: "bg-red-100 text-red-700",
};

export default async function ReportHoursPage() {
  const user = await requireUser("member");
  const reports = await listReportsForUser(user.id);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Report hours</h1>
        <p className="text-sm text-gray-500">
          Log service hours for activities without an official event. An officer
          reviews each submission before it counts toward your total.
        </p>
      </div>

      <form action={reportHoursAction} className="rounded-xl bg-white p-6 shadow-sm">
        <div className="space-y-4">
          <div>
            <label htmlFor="description" className={label}>
              What did you do?
            </label>
            <input id="description" name="description" required className={field} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="date" className={label}>
                Date
              </label>
              <input id="date" name="date" type="date" required className={field} />
            </div>
            <div>
              <label htmlFor="hoursRequested" className={label}>
                Hours
              </label>
              <input
                id="hoursRequested"
                name="hoursRequested"
                type="number"
                step="0.5"
                min="0.5"
                required
                className={field}
              />
            </div>
          </div>
          <div>
            <label htmlFor="notes" className={label}>
              Notes (optional)
            </label>
            <textarea id="notes" name="notes" rows={2} className={field} />
          </div>
          <SubmitButton pendingText="Submitting…">Submit for Approval</SubmitButton>
        </div>
      </form>

      <section className="rounded-xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900">Your reports</h2>
        {reports.length === 0 ? (
          <p className="text-sm text-gray-500">No reports yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {reports.map((r) => (
              <li key={r.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium text-gray-900">{r.description}</p>
                  <p className="text-sm text-gray-500">
                    {formatEventDate(r.date)} · {r.hoursRequested} hrs
                  </p>
                </div>
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${REPORT_BADGE[r.status]}`}
                >
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
