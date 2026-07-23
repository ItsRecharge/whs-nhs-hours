import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/current-user";
import { getEventForEdit } from "@/lib/services/event-service";
import {
  cancelEventAction,
  deleteEventAction,
  editEventAction,
} from "@/actions/events";
import { SlotRows } from "@/components/forms/SlotRows";
import { SubmitButton } from "@/components/SubmitButton";

const field =
  "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

export default async function EditEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser("officer");
  const { id } = await params;
  const eventId = Number(id);
  const event = await getEventForEdit(eventId);
  if (!event) notFound();

  const toInput = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/officer/events"
          className="flex items-center gap-1.5 text-sm text-indigo-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to events
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Edit event</h1>
      </div>

      <form action={editEventAction} className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
        <input type="hidden" name="eventId" value={event.id} />

        <div>
          <label htmlFor="title" className={label}>
            Title
          </label>
          <input
            id="title"
            name="title"
            defaultValue={event.title}
            required
            className={field}
          />
        </div>
        <div>
          <label htmlFor="location" className={label}>
            Location
          </label>
          <input
            id="location"
            name="location"
            defaultValue={event.location ?? ""}
            className={field}
          />
        </div>
        <div>
          <label htmlFor="description" className={label}>
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={event.description ?? ""}
            className={field}
          />
        </div>

        <div>
          <p className={label}>Existing timeslots</p>
          <div className="space-y-3">
            {event.timeslots.map((slot) => (
              <div key={slot.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                <input type="hidden" name="existingSlotId" value={slot.id} />
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <label className="col-span-2 text-xs text-gray-600">
                    Date
                    <input
                      type="date"
                      name="existDate"
                      defaultValue={toInput(slot.date)}
                      className={field}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Start
                    <input
                      type="time"
                      name="existStart"
                      defaultValue={slot.startTime}
                      className={field}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    End
                    <input
                      type="time"
                      name="existEnd"
                      defaultValue={slot.endTime}
                      className={field}
                    />
                  </label>
                  <label className="text-xs text-gray-600">
                    Hours
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      name="existHours"
                      defaultValue={slot.hoursValue}
                      className={field}
                    />
                  </label>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <label className="text-xs text-gray-600">
                    Volunteers needed{" "}
                    <input
                      type="number"
                      min="1"
                      name="existQuota"
                      defaultValue={slot.quota}
                      className="ml-1 w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-red-600">
                    <input type="checkbox" name="removeSlotId" value={slot.id} />
                    Remove{slot._count.signups > 0 ? ` (${slot._count.signups} signed up)` : ""}
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className={label}>Add timeslots</p>
          <SlotRows initialRows={0} />
        </div>

        <SubmitButton pendingText="Saving…">Save Changes</SubmitButton>
      </form>

      <div className="flex flex-wrap gap-3 rounded-xl bg-white p-6 shadow-sm">
        <form action={cancelEventAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <button
            type="submit"
            className="rounded-md border border-yellow-300 bg-yellow-50 px-4 py-2 text-sm font-semibold text-yellow-800 transition hover:bg-yellow-100"
          >
            Cancel event (notify members)
          </button>
        </form>
        <form action={deleteEventAction}>
          <input type="hidden" name="eventId" value={event.id} />
          <button
            type="submit"
            className="rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            Delete event
          </button>
        </form>
      </div>
    </div>
  );
}
