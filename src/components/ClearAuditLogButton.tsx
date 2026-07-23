"use client";

import { Trash2 } from "lucide-react";
import { clearAuditLogAction } from "@/actions/audit";

/** Bootstrap-only button to wipe the audit log, with a confirm guard. */
export function ClearAuditLogButton() {
  return (
    <form
      action={clearAuditLogAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            "Clear the entire audit log? This permanently deletes all recorded actions and cannot be undone.",
          )
        ) {
          e.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className="flex items-center gap-1.5 rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Clear log
      </button>
    </form>
  );
}
