"use client";

import { useEffect, useState } from "react";
import { Settings, X } from "lucide-react";
import { SettingsPanels, type SettingsPanelsProps } from "@/components/SettingsPanels";

interface SettingsModalProps extends SettingsPanelsProps {
  fullName: string;
  /** Classes applied to the trigger row, to match its surrounding nav styling. */
  triggerClassName?: string;
}

/** "Settings" trigger that opens the account settings as a blurred-backdrop modal. */
export function SettingsModal({
  fullName,
  email,
  triggerClassName = "",
  ...panels
}: SettingsModalProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    if (open) {
      window.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`flex items-center gap-2 text-sm opacity-85 transition hover:opacity-100 ${triggerClassName}`}
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-3 backdrop-blur-md sm:items-center sm:p-6"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Account settings"
            onClick={(event) => event.stopPropagation()}
            className="my-auto w-full max-w-2xl rounded-[28px] border border-white/30 bg-gray-50 p-6 text-left shadow-2xl sm:p-8"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{fullName}</h2>
                <p className="text-sm text-gray-500">{email}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close settings"
                className="rounded-full bg-gray-200 p-2 text-gray-700 transition hover:bg-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <SettingsPanels email={email} {...panels} />
          </div>
        </div>
      ) : null}
    </>
  );
}
