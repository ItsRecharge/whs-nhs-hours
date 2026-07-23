"use client";

import { useActionState } from "react";
import {
  changeEmailAction,
  changePasswordAction,
  updateProfileAction,
  type AccountFormState,
} from "@/actions/account";
import { SubmitButton } from "@/components/SubmitButton";
import { fieldClass, labelClass } from "@/components/AuthShell";

function Feedback({ state }: { state: AccountFormState }) {
  if (state.error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800">
        {state.error}
      </div>
    );
  }
  if (state.success) {
    return (
      <div className="rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
        {state.success}
      </div>
    );
  }
  return null;
}

export function ProfileForm({
  firstName,
  lastName,
  graduationYear,
}: {
  firstName: string;
  lastName: string;
  graduationYear: number | null;
}) {
  const [state, action] = useActionState<AccountFormState, FormData>(
    updateProfileAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="firstName" className={labelClass}>
            First name
          </label>
          <input
            id="firstName"
            name="firstName"
            defaultValue={firstName}
            required
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="lastName" className={labelClass}>
            Last name
          </label>
          <input
            id="lastName"
            name="lastName"
            defaultValue={lastName}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <label htmlFor="graduationYear" className={labelClass}>
          Graduation year
        </label>
        <input
          id="graduationYear"
          name="graduationYear"
          type="number"
          min="1980"
          max="2100"
          defaultValue={graduationYear ?? ""}
          className={fieldClass}
        />
      </div>
      <SubmitButton pendingText="Saving…">Save Profile</SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState<AccountFormState, FormData>(
    changePasswordAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div>
        <label htmlFor="currentPassword" className={labelClass}>
          Current password
        </label>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="newPassword" className={labelClass}>
          New password
        </label>
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          className={fieldClass}
        />
        <p className="mt-1 text-xs text-gray-500">At least 8 characters.</p>
      </div>
      <SubmitButton pendingText="Updating…">Update Password</SubmitButton>
    </form>
  );
}

export function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action] = useActionState<AccountFormState, FormData>(
    changeEmailAction,
    {},
  );
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div>
        <label htmlFor="newEmail" className={labelClass}>
          New email
        </label>
        <input
          id="newEmail"
          name="newEmail"
          type="email"
          required
          defaultValue=""
          placeholder={currentEmail}
          className={fieldClass}
        />
      </div>
      <div>
        <label htmlFor="emailCurrentPassword" className={labelClass}>
          Confirm with your password
        </label>
        <input
          id="emailCurrentPassword"
          name="currentPassword"
          type="password"
          required
          className={fieldClass}
        />
      </div>
      <SubmitButton pendingText="Sending…">Send Verification Link</SubmitButton>
    </form>
  );
}
