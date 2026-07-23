"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  className = "",
  pendingText = "Working…",
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={`cursor-pointer rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-800 disabled:cursor-default disabled:opacity-60 ${className}`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
