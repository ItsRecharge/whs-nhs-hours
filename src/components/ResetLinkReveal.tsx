"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";

/** Reads the one-time password-reset link cookie, shows it with a copy button, clears it. */
export function ResetLinkReveal() {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith("nhs_last_reset_link="));
    if (match) {
      setLink(decodeURIComponent(match.split("=").slice(1).join("=")));
      document.cookie = "nhs_last_reset_link=; path=/officer/officers; max-age=0";
    }
  }, []);

  if (!link) return null;

  return (
    <div className="rounded-xl border border-green-300 bg-green-50 p-4">
      <p className="mb-2 text-sm font-semibold text-green-800">
        Password reset link (copy it now — it expires in 1 hour and won&apos;t be shown again):
      </p>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={link}
          className="flex-1 rounded-md border border-green-300 bg-white px-3 py-2 font-mono text-xs text-gray-800"
        />
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
