"use client";

import { useActionState } from "react";
import { signupAction, type SignupFormState } from "@/actions/signup";
import { SubmitButton } from "@/components/SubmitButton";
import { fieldClass, labelClass } from "@/components/AuthShell";

export function SignupForm({ inviteToken }: { inviteToken: string }) {
  const [state, formAction] = useActionState<SignupFormState, FormData>(signupAction, {});

  return (
    <form action={formAction} className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}
      <input type="hidden" name="inviteToken" value={inviteToken} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input id="firstName" name="firstName" required className={fieldClass} />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input id="lastName" name="lastName" className={fieldClass} />
        </div>
      </div>
      <div>
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input id="email" name="email" type="email" required className={fieldClass} />
      </div>
      <div>
        <label htmlFor="graduationYear" className={labelClass}>
          Graduation year <span className="text-gray-400">(optional)</span>
        </label>
        <input
          id="graduationYear"
          name="graduationYear"
          type="number"
          min="1980"
          max="2100"
          placeholder="e.g. 2027"
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="password" className={labelClass}>
          Password
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
      <SubmitButton className="w-full" pendingText="Creating account…">
        Create Account
      </SubmitButton>
    </form>
  );
}
