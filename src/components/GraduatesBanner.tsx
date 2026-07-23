"use client";

import { GraduationCap } from "lucide-react";
import { deactivateGraduatesAction } from "@/actions/roster";

export function GraduatesBanner({
  count,
  cutoffYear,
}: {
  count: number;
  cutoffYear: number;
}) {
  return (
    <form
      action={deactivateGraduatesAction}
      onSubmit={(e) => {
        if (
          !window.confirm(
            `Deactivate ${count} graduated member${count === 1 ? "" : "s"} (Class of ${cutoffYear} and earlier)? They will be logged out and unable to log in. Their records are kept.`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3"
    >
      <GraduationCap className="h-5 w-5 shrink-0 text-amber-700" />
      <p className="flex-1 text-sm text-amber-900">
        <span className="font-semibold">
          {count} member{count === 1 ? " has" : "s have"} graduated
        </span>{" "}
        (Class of {cutoffYear} and earlier) and {count === 1 ? "is" : "are"} still
        active.
      </p>
      <button
        type="submit"
        className="rounded-md border border-amber-400 bg-white px-3.5 py-1.5 text-sm font-semibold text-amber-800 transition hover:bg-amber-100"
      >
        Deactivate graduated seniors
      </button>
    </form>
  );
}
