import { requireUser, fullName } from "@/lib/current-user";
import { listPendingRequests } from "@/lib/services/event-service";
import { listPendingReports } from "@/lib/services/hour-report-service";
import { approveRequestAction, denyRequestAction } from "@/actions/events";
import { approveReportAction, denyReportAction } from "@/actions/hour-reports";
import { SubmitButton } from "@/components/SubmitButton";
import { formatEventDate, formatSlot } from "@/lib/format";

const denyBtn =
  "cursor-pointer rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50";

export default async function OfficerRequestsPage() {
  await requireUser("officer");
  const [requests, reports] = await Promise.all([
    listPendingRequests(),
    listPendingReports(),
  ]);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Event requests</h1>
          <p className="text-sm text-gray-500">
            Approve to publish the event (members are notified) or deny it.
          </p>
        </div>

        {requests.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No pending event requests.
          </p>
        ) : (
          <ul className="space-y-4">
            {requests.map((e) => (
              <li key={e.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{e.title}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Requested by {fullName(e.createdBy)}
                      {e.location ? ` · ${e.location}` : ""}
                    </p>
                    <ul className="mt-1 text-sm text-gray-500">
                      {e.timeslots.map((s) => (
                        <li key={s.id}>
                          {formatSlot(s)} · {s.hoursValue} hrs · needs {s.quota}
                        </li>
                      ))}
                    </ul>
                    {e.description && (
                      <p className="mt-2 text-sm text-gray-600">{e.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveRequestAction}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <SubmitButton pendingText="…">Approve</SubmitButton>
                    </form>
                    <form action={denyRequestAction}>
                      <input type="hidden" name="eventId" value={e.id} />
                      <button type="submit" className={denyBtn}>
                        Deny
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hour reports</h2>
          <p className="text-sm text-gray-500">
            Member-submitted hours for activities without an official event.
          </p>
        </div>

        {reports.length === 0 ? (
          <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            No pending hour reports.
          </p>
        ) : (
          <ul className="space-y-4">
            {reports.map((r) => (
              <li key={r.id} className="rounded-xl bg-white p-5 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">
                      {r.description}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {fullName(r.user)} · {formatEventDate(r.date)} ·{" "}
                      {r.hoursRequested} hrs
                    </p>
                    {r.notes && (
                      <p className="mt-2 text-sm text-gray-600">{r.notes}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <form action={approveReportAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <SubmitButton pendingText="…">Approve</SubmitButton>
                    </form>
                    <form action={denyReportAction}>
                      <input type="hidden" name="reportId" value={r.id} />
                      <button type="submit" className={denyBtn}>
                        Deny
                      </button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
