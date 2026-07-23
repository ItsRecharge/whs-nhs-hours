"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function OpsSettingsModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
      >
        Settings
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 backdrop-blur-md">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-lg rounded-[28px] border border-white/30 bg-white/95 p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Console Settings</h2>
                <p className="text-sm text-gray-500">
                  Quick actions and shortcuts with a blurred modal shell.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gray-100 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-200"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Link
                href="/officer/chapter"
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <p className="font-semibold text-gray-900">Chapter settings</p>
                <p className="mt-1 text-sm text-gray-500">Name and total hours goal.</p>
              </Link>
              <Link
                href="/officer/integrations"
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <p className="font-semibold text-gray-900">Integrations</p>
                <p className="mt-1 text-sm text-gray-500">Email and Sheets backup.</p>
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}