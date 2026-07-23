"use client";

import { useEffect, useState } from "react";
import type { FlashMessage } from "@/lib/flash";

const STYLES: Record<FlashMessage["category"], string> = {
  success: "border-green-300 bg-green-50 text-green-800",
  warning: "border-yellow-300 bg-yellow-50 text-yellow-800",
  danger: "border-red-300 bg-red-50 text-red-800",
  info: "border-primary-300 bg-primary-50 text-primary-800",
};

/**
 * Renders read-once flash messages set by server actions. Server components
 * can't delete cookies, so the cookie is cleared here on mount.
 */
export function FlashMessages({ messages }: { messages: FlashMessage[] }) {
  const [visible, setVisible] = useState(messages);

  useEffect(() => {
    if (messages.length > 0) {
      document.cookie = "nhs_flash=; path=/; max-age=0";
    }
  }, [messages]);

  if (visible.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {visible.map((m, i) => (
        <div
          key={i}
          className={`flex items-center justify-between rounded-md border px-4 py-2.5 text-sm ${STYLES[m.category]}`}
        >
          <span>{m.message}</span>
          <button
            type="button"
            aria-label="Dismiss"
            className="ml-4 font-bold opacity-60 hover:opacity-100"
            onClick={() => setVisible((v) => v.filter((_, j) => j !== i))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
