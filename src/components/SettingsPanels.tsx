"use client";

import { ShieldOff } from "lucide-react";
import { logoutEverywhereAction } from "@/actions/auth";
import {
  ChangeEmailForm,
  ChangePasswordForm,
  ProfileForm,
} from "@/components/SettingsForms";

export interface SettingsPanelsProps {
  firstName: string;
  lastName: string;
  email: string;
  graduationYear: number | null;
  pendingEmail: string | null;
  activeSessions: number;
}

/** The four account-settings sections, rendered inside the settings modal. */
export function SettingsPanels({
  firstName,
  lastName,
  email,
  graduationYear,
  pendingEmail,
  activeSessions,
}: SettingsPanelsProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Profile</h2>
        <ProfileForm
          firstName={firstName}
          lastName={lastName}
          graduationYear={graduationYear}
        />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Change password</h2>
        <p className="mb-4 text-sm text-gray-500">
          Confirm with your current password — no email needed while you&apos;re
          signed in.
        </p>
        <ChangePasswordForm />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Change email</h2>
        <p className="mb-4 text-sm text-gray-500">
          Confirm with your current password. We&apos;ll email a verification link
          to the new address — it only takes effect once you click it.
        </p>
        {pendingEmail && (
          <div className="mb-4 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
            Pending change to <strong>{pendingEmail}</strong> — check that inbox for
            the verification link.
          </div>
        )}
        <ChangeEmailForm currentEmail={email} />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Sessions</h2>
        <p className="mb-4 text-sm text-gray-500">
          You have {activeSessions} active session{activeSessions === 1 ? "" : "s"}.
          Sign out everywhere to revoke them on all devices (you&apos;ll be logged
          out here too).
        </p>
        <form action={logoutEverywhereAction}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
          >
            <ShieldOff className="h-4 w-4" />
            Sign out everywhere
          </button>
        </form>
      </section>
    </div>
  );
}
