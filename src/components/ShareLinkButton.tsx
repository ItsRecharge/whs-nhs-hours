"use client";

import { useState } from "react";
import { Share2, X } from "lucide-react";
import { createShareLinkAction } from "@/actions/share-links";
import { SubmitButton } from "@/components/SubmitButton";

const field =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200";
const label = "mb-1 block text-sm font-medium text-gray-700";

/**
 * "Share" button + modal for creating an organizer share link. kind="roster"
 * shares the member roster; kind="attendance" (with eventId) shares one
 * event's attendance sheet.
 */
export function ShareLinkButton({
  kind,
  eventId,
  buttonClassName,
}: {
  kind: "roster" | "attendance";
  eventId?: number;
  buttonClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          buttonClassName ??
          "inline-flex items-center gap-1.5 rounded-md border border-primary-300 bg-primary-50 px-3 py-1.5 text-sm font-semibold text-primary-800 transition hover:bg-primary-100"
        }
      >
        <Share2 className="h-4 w-4" />
        {kind === "roster" ? "Share roster" : "Share attendance"}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {kind === "roster"
                    ? "Share roster with an organizer"
                    : "Share attendance with an organizer"}
                </h2>
                <p className="mt-0.5 text-sm text-gray-500">
                  Creates a public link — no account needed. They only see{" "}
                  {kind === "roster" ? "the read-only roster" : "this event's attendance sheet"}
                  , nothing else.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form action={createShareLinkAction} className="space-y-4">
              <input type="hidden" name="kind" value={kind} />
              {eventId ? <input type="hidden" name="eventId" value={eventId} /> : null}
              <div>
                <label htmlFor="organizerName" className={label}>
                  Organizer name
                </label>
                <input
                  id="organizerName"
                  name="organizerName"
                  required
                  maxLength={80}
                  placeholder="e.g. Town Food Pantry — Dana"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="organizerEmail" className={label}>
                  Organizer email <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  id="organizerEmail"
                  name="organizerEmail"
                  type="email"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="expiresInDays" className={label}>
                  Expires in (days)
                </label>
                <input
                  id="expiresInDays"
                  name="expiresInDays"
                  type="number"
                  min="1"
                  max="365"
                  defaultValue={30}
                  required
                  className={field}
                />
              </div>
              <SubmitButton pendingText="Creating…">Create Share Link</SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
