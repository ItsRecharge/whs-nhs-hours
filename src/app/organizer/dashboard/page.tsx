import Link from "next/link";
import { requireUser, fullName } from "@/lib/current-user";
import { listEventsForOrganizer } from "@/lib/services/organizer-service";
import { StatusBadge } from "@/components/StatusBadge";
import { formatSlot } from "@/lib/format";

export default async function OrganizerDashboard() {
  const user = await requireUser("organizer");
  const events = await listEventsForOrganizer(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome, {fullName(user)}
        </h1>
        <p className="text-sm text-gray-500">
          Events the NHS chapter has partnered with you on. Open one to take
          attendance.
        </p>
      </div>

      {events.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          No events are linked to your account yet. An NHS officer links you to
          events you partner on.
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((e) => (
            <li key={e.id} className="rounded-xl bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-gray-900">{e.title}</p>
                  {e.location && (
                    <p className="text-sm text-gray-500">{e.location}</p>
                  )}
                  <ul className="mt-1 text-sm text-gray-500">
                    {e.timeslots.map((s) => (
                      <li key={s.id}>
                        {formatSlot(s)} · {s.hoursValue} hrs
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={e.status} />
                  <Link
                    href={`/organizer/events/${e.id}/attendance`}
                    className="rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-800 transition hover:bg-blue-100"
                  >
                    Attendance
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
