"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction, type ResetFormState } from "@/actions/password-reset";
import { AuthShell, fieldClass, labelClass } from "@/components/AuthShell";
import { SubmitButton } from "@/components/SubmitButton";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<ResetFormState, FormData>(
    forgotPasswordAction,
    {},
  );

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll email you a link to reset it."
      footer={
        <Link href="/login" className="hover:underline">
          Back to login
        </Link>
      }
    >
      <form action={formAction} className="space-y-4">
        {state.error && (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
            {state.error}
          </div>
        )}
        <div>
          <label htmlFor="email" className={labelClass}>
            Email
          </label>
          <input id="email" name="email" type="email" required className={fieldClass} />
        </div>
        <SubmitButton className="w-full" pendingText="Sending…">
          Send Reset Link
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
