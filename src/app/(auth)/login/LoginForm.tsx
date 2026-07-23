"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, type AuthFormState } from "@/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";
import { fieldClass, labelClass } from "@/components/AuthShell";
import { resendVerificationAction } from "@/actions/signup";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState<AuthFormState, FormData>(loginAction, {});

  return (
    <div className="space-y-4">
      {state.error && (
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        {next && <input type="hidden" name="next" value={next} />}
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={fieldClass} />
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
            className={fieldClass}
          />
        </div>
        <SubmitButton className="w-full" pendingText="Signing in…">
          Sign In
        </SubmitButton>
      </form>

      {state.unverifiedEmail && (
        <form action={resendVerificationAction}>
          <input type="hidden" name="email" value={state.unverifiedEmail} />
          <button
            type="submit"
            className="text-sm font-medium text-indigo-700 hover:underline"
          >
            Resend verification email
          </button>
        </form>
      )}

      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-indigo-700 hover:underline">
          Forgot password?
        </Link>
        <Link href="/signup" className="text-indigo-700 hover:underline">
          Have an invite? Sign up
        </Link>
      </div>
    </div>
  );
}
