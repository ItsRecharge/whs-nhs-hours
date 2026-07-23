import { redirect } from "next/navigation";
import { validateShareLink } from "@/lib/services/share-service";
import { getEventForAttendance } from "@/lib/services/attendance-service";
import { markShareAttendanceAction } from "@/actions/share-attendance";
import { SubmitButton } from "@/components/SubmitButton";
import { fullName } from "@/lib/current-user";
import { formatSlot } from "@/lib/format";
import { rateLimit } from "@/lib/rate-limit";
import { requestIp } from "@/lib/request-ip";

export const metadata = { title: "Attendance — Aberjona NHS" };
export const dynamic = "force-dynamic";

export default async function ShareAttendancePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const ip = await requestIp();
  if (!rateLimit(`share-view:${ip}`, 60, 60 * 60 * 1000)) redirect("/share/expired");

  const link = await validateShareLink(token, "attendance");
  if (!link || !link.eventId) redirect("/share/expired");

  const event = await getEventForAttendance(link.eventId);
  if (!event) redirect("/share/expired");

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{event.title}</h1>
        <p className="text-sm text-gray-500">
          Attendance sheet shared with {link.organizerName}. Check off the
          volunteers who showed up and save each timeslot — hours are credited
          automatically.
        </p>
      </div>

      {event.timeslots.map((slot) => {
        const confirmed = slot.signups.filter((s) => s.status === "confirmed");
        return (
          <form
            key={slot.id}
            action={markShareAttendanceAction}
            className="rounded-xl bg-white p-6 shadow-sm"
          >
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="timeslotId" value={slot.id} />

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
