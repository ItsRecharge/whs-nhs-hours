import { requireUser } from "@/lib/current-user";
import { requestEventAction } from "@/actions/events";
import { EventFormFields } from "@/components/forms/EventForm";

export default async function RequestEventPage() {
  await requireUser("member");

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Request an event</h1>
        <p className="text-sm text-gray-500">
          Suggest a volunteer opportunity. An officer will review and approve it.
        </p>
      </div>

      <form action={requestEventAction} className="rounded-xl bg-white p-6 shadow-sm">
        <EventFormFields submitLabel="Submit Request" allowMultipleSlots={false} />
      </form>
    </div>
  );
}
