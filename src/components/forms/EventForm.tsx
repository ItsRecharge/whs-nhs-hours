import { SubmitButton } from "@/components/SubmitButton";
import { SlotRows } from "./SlotRows";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

/**
 * Shared event fields for officer-create (multi-slot) and member-request
 * (single-slot) forms.
 */
export function EventFormFields({
  submitLabel,
  allowMultipleSlots = true,
}: {
  submitLabel: string;
  allowMultipleSlots?: boolean;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className={label}>
          Title
        </label>
        <input id="title" name="title" required className={field} />
      </div>
      <div>
        <label htmlFor="location" className={label}>
          Location
        </label>
        <input id="location" name="location" className={field} />
      </div>
      <div>
        <label htmlFor="description" className={label}>
          Description
        </label>
        <textarea id="description" name="description" rows={3} className={field} />
      </div>

      <div>
        <p className={label}>Timeslots</p>
        <SlotRows allowMultiple={allowMultipleSlots} />
      </div>

      <SubmitButton pendingText="Saving…">{submitLabel}</SubmitButton>
    </div>
  );
}
