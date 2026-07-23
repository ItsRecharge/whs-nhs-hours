"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";

const field =
  "w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

interface Row {
  key: number;
}

/**
 * Dynamic timeslot rows. Each row submits parallel arrays (slotDate[],
 * slotStart[], slotEnd[], slotHours[], slotQuota[]) that the server action zips
 * back into slot objects. `allowMultiple` is false for member requests.
 */
export function SlotRows({
  allowMultiple = true,
  initialRows = 1,
}: {
  allowMultiple?: boolean;
  initialRows?: number;
}) {
  const [rows, setRows] = useState<Row[]>(() =>
    Array.from({ length: initialRows }, (_, i) => ({ key: i })),
  );
  const [nextKey, setNextKey] = useState(initialRows);

  const add = () => {
    setRows((r) => [...r, { key: nextKey }]);
    setNextKey((k) => k + 1);
  };
  const remove = (key: number) =>
    setRows((r) => (r.length > 1 ? r.filter((row) => row.key !== key) : r));

  return (
    <div className="space-y-3">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div
            key={row.key}
            className="rounded-lg border border-gray-200 bg-gray-50 p-3"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500">
                Timeslot {i + 1}
              </span>
              {allowMultiple && rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => remove(row.key)}
                  className="flex items-center gap-1 text-xs text-red-600 hover:underline"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <label className="col-span-2 sm:col-span-2 text-xs text-gray-600">
                Date
                <input type="date" name="slotDate" required className={field} />
              </label>
              <label className="text-xs text-gray-600">
                Start
                <input type="time" name="slotStart" required className={field} />
              </label>
              <label className="text-xs text-gray-600">
                End
                <input type="time" name="slotEnd" required className={field} />
              </label>
              <label className="text-xs text-gray-600">
                Hours
                <input
                  type="number"
                  name="slotHours"
                  step="0.5"
                  min="0.5"
                  defaultValue="1"
                  required
                  className={field}
                />
              </label>
              <label className="text-xs text-gray-600">
                Volunteers needed
                <input
                  type="number"
                  name="slotQuota"
                  min="1"
                  defaultValue="5"
                  required
                  className={field}
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {allowMultiple && (
        <button
          type="button"
          onClick={add}
          className="flex items-center gap-1.5 text-sm font-medium text-indigo-700 hover:underline"
        >
          <Plus className="h-4 w-4" /> Add timeslot
        </button>
      )}
    </div>
  );
}
