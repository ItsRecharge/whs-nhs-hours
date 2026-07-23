"use client";

import { useState, useEffect, useCallback } from "react";
import { Globe, X } from "lucide-react";
import { dismissDomainReminderAction } from "@/actions/domain-reminder";
import { SubmitButton } from "@/components/SubmitButton";

export function DomainRenewalPopup({
  renewalUrl,
  signInEmail,
}: {
  renewalUrl: string;
  signInEmail: string;
}) {
  const [open, setOpen] = useState(true);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 backdrop-blur-md sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        // transform-gpu + isolate keep the rounded corners on scroll repaint (Safari).
        className="flex max-h-[92dvh] w-full transform-gpu isolate flex-col overflow-hidden rounded-t-[28px] border border-white/30 bg-white shadow-2xl [backface-visibility:hidden] sm:max-w-md sm:rounded-[28px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-gray-100 px-6 pb-4 pt-5">
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-100 p-2 text-indigo-700">
              <Globe className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Renew the chapter domain</h2>
              <p className="mt-0.5 text-sm text-gray-500">Annual reminder</p>
            </div>
          </div>
          <button
            type="button"
            onClick={close}
            className="mt-0.5 rounded-full bg-gray-100 p-1.5 text-gray-500 transition hover:bg-gray-200 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          <p className="text-sm leading-relaxed text-gray-700">
            The chapter&apos;s website domain <strong>wpsmusicdep.com</strong> is due for its
            yearly renewal. Please renew it through Cloudflare so the site stays online.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-gray-700">
            Sign in to Cloudflare with <strong>{signInEmail}</strong> using{" "}
            <strong>&ldquo;Sign in with Google&rdquo;</strong>, then complete the renewal on the
            registration page.
          </p>

          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <a
              href={renewalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800"
            >
              <Globe className="h-4 w-4" />
              Open Cloudflare
            </a>
            <form action={dismissDomainReminderAction}>
              <SubmitButton
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                pendingText="Dismissing…"
              >
                Dismiss for this year
              </SubmitButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
