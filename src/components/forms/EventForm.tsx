import { SubmitButton } from "@/components/SubmitButton";
import { HOUR_CATEGORIES, HOUR_CATEGORY_LABELS } from "@/lib/constants";
import { SlotRows } from "./SlotRows";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

/**
 * Shared event fields for officer-create (multi-slot) and member-request
 * (single-slot) forms.
 */
export function EventFormFields({
  submitLabel,
  allowMultipleSlots = true,
  defaultCategory = "general",
}: {
  submitLabel: string;
  allowMultipleSlots?: boolean;
  defaultCategory?: string;
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
        <label htmlFor="category" className={label}>
          Hour type
        </label>
        <select
          id="category"
          name="category"
          defaultValue={defaultCategory}
          className={field}
        >
          {HOUR_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {HOUR_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Attendance credits count toward this hour type (tutoring, soup kitchen,
          and gardening each satisfy a member requirement).
        </p>
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
