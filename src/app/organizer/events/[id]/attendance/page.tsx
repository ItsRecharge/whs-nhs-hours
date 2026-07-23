import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser, fullName } from "@/lib/current-user";
import { getEventForAttendance } from "@/lib/services/attendance-service";
import { isOrganizerLinked } from "@/lib/services/organizer-service";
import { markAttendanceAction } from "@/actions/attendance";
import { SubmitButton } from "@/components/SubmitButton";
import { formatSlot } from "@/lib/format";

export default async function OrganizerAttendancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const organizer = await requireUser("organizer");
  const { id } = await params;
  const eventId = Number(id);

  if (!(await isOrganizerLinked(organizer.id, eventId))) {
    redirect("/organizer/dashboard");
  }
  const event = await getEventForAttendance(eventId);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/organizer/dashboard"
          className="text-sm text-primary-800 hover:underline"
        >
          ← Back to my events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-sm text-gray-500">
          Check off the volunteers who showed up and save each timeslot — their
          hours are credited automatically.
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

            <div className="mb-3">
              <p className="font-semibold text-gray-900">{formatSlot(slot)}</p>
              <p className="text-xs text-gray-500">
                {slot.hoursValue} hrs · {confirmed.length} confirmed
                {slot.completedAt ? " · recorded" : ""}
              </p>
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
                        className="h-4 w-4 rounded border-gray-300 text-primary-700"
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
