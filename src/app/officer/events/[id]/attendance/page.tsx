import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { getEventForAttendance } from "@/lib/services/attendance-service";
import { markAttendanceAction } from "@/actions/attendance";
import { SubmitButton } from "@/components/SubmitButton";
import { formatSlot } from "@/lib/format";

export default async function AttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("officer");
  const { id } = await params;
  const eventId = Number(id);
  const event = await getEventForAttendance(eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/officer/events" className="text-sm text-indigo-700 hover:underline">
          ← Back to events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-sm text-gray-500">
          Take attendance per timeslot. The event is marked completed once every slot
          is recorded. Only confirmed volunteers are listed.
        </p>
      </div>

      {event.timeslots.map((slot) => {
        const confirmed = slot.signups.filter((s) => s.status === "confirmed");
        return (
          <form
            key={slot.id}
            action={markAttendanceAction}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="timeslotId" value={slot.id} />
            <input type="hidden" name="eventId" value={eventId} />

            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{formatSlot(slot)}</p>
                <p className="text-xs text-gray-500">
                  {slot.hoursValue} hrs · {confirmed.length} confirmed
                  {slot.completedAt ? " · recorded" : ""}
                </p>
              </div>
            </div>

            {confirmed.length === 0 ? (
              <p className="text-sm text-gray-500">No confirmed volunteers.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-100">
                  {confirmed.map((s) => (
                    <li key={s.id} className="flex items-center gap-3 py-2.5">
                      <input
                        type="checkbox"
                        id={`p-${slot.id}-${s.userId}`}
                        name="present"
                        value={s.userId}
                        defaultChecked={s.attended}
                        className="h-4 w-4 rounded border-gray-300 text-indigo-600"
                      />
                      <label
                        htmlFor={`p-${slot.id}-${s.userId}`}
                        className="text-sm font-medium text-gray-900"
                      >
                        {fullName(s.user)}
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="mt-4">
                  <SubmitButton pendingText="Saving…">
                    {slot.completedAt ? "Update attendance" : "Save attendance"}
                  </SubmitButton>
                </div>
              </>
            )}
          </form>
        );
      })}
    </div>
  );
}
