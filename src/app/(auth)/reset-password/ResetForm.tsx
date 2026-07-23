"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ResetFormState } from "@/actions/password-reset";
import { fieldClass, labelClass } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";

export function ResetForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ResetFormState, FormData>(
    resetPasswordAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <input type="hidden" name="token" value={token} />
      <div>
        <label htmlFor="password" className={labelClass}>
          New password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
      </div>
      <SubmitButton className="w-full" pendingText="Updating…">
        Update Password
      </SubmitButton>
    </form>
  );
}
