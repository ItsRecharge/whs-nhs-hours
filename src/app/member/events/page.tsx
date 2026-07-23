import { requireUser } from "@/lib/current-user";
import { listActiveEventsForMember } from "@/lib/services/event-service";
import { signupAction, withdrawAction } from "@/actions/signups";
import { SubmitButton } from "@/components/SubmitButton";
import { formatSlot } from "@/lib/format";

export default async function MemberEventsPage() {
  const user = await requireUser("member");
  const events = await listActiveEventsForMember(user.id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Volunteer events</h1>

      {events.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          There are no active events right now. Check back soon!
        </p>
      ) : (
        <ul className="space-y-4">
          {events.map((event) => (
            <li key={event.id} className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-lg font-semibold text-gray-900">{event.title}</p>
              {event.location && (
                <p className="text-sm text-gray-500">{event.location}</p>
              )}
              {event.description && (
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
              )}

              <ul className="mt-3 divide-y divide-gray-100">
                {event.timeslots.map((slot) => {
                  const confirmed = slot.signups.filter(
                    (s) => s.status === "confirmed",
                  ).length;
                  const mine = slot.signups.find((s) => s.userId === user.id);
                  const isFull = confirmed >= slot.quota;

                  return (
                    <li
                      key={slot.id}
                      className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {formatSlot(slot)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {slot.hoursValue} hrs · {confirmed}/{slot.quota} filled
                          {isFull && !mine ? " · full" : ""}
                          {mine?.status === "waitlisted" ? " · you're waitlisted" : ""}
                          {mine?.status === "confirmed" ? " · you're in" : ""}
                        </p>
                      </div>

                      {mine ? (
                        <form action={withdrawAction}>
                          <input type="hidden" name="timeslotId" value={slot.id} />
                          <button
                            type="submit"
                            className="cursor-pointer rounded-md border border-gray-300 px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                          >
                            {mine.status === "waitlisted" ? "Leave waitlist" : "Withdraw"}
                          </button>
                        </form>
                      ) : (
                        <form action={signupAction}>
                          <input type="hidden" name="timeslotId" value={slot.id} />
                          <SubmitButton pendingText="…">
                            {isFull ? "Join waitlist" : "Sign up"}
                          </SubmitButton>
                        </form>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
