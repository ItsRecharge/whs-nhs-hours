import { requireUser } from "@/lib/current-user";
import { listReportsForUser } from "@/lib/services/hour-report-service";
import { ReportHoursForm } from "@/components/ReportHoursForm";
import { HOUR_CATEGORY_LABELS, type HourCategory } from "@/lib/constants";
import { formatEventDate } from "@/lib/format";

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
        <h1 className="text-2xl font-bold text-gray-900">Manually report hours</h1>
        <p className="text-sm text-gray-500">
          Log service hours for activities without an official event. An officer
          reviews each submission before it counts toward your total.
        </p>
      </div>

      <ReportHoursForm />

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
                    {formatEventDate(r.date)} · {r.hoursRequested} hrs ·{" "}
                    {HOUR_CATEGORY_LABELS[r.category as HourCategory] ?? "General"} ·{" "}
                    {r.origin === "outside" ? "Outside" : "Inside"}
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
