import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { validateInvite } from "@/lib/services/invite-service";
import { SignupForm } from "./SignupForm";

const INVALID_MESSAGE: Record<string, string> = {
  not_found: "This invite link is not valid.",
  revoked: "This invite link has been revoked.",
  expired: "This invite link has expired.",
  exhausted: "This invite link has reached its usage limit.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;

  if (!invite) {
    return (
      <AuthShell
        title="Invite required"
        subtitle="Sign-up is invite-only for chapter members."
      >
        <p className="text-sm text-gray-600">
          Ask a chapter officer for an invite link, then open it to create your account.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
        >
          Already have an account? Log in
        </Link>
      </AuthShell>
    );
  }

  const validation = await validateInvite(invite);
  if (!validation.valid) {
    return (
      <AuthShell title="Invite unavailable">
        <p className="text-sm text-gray-600">
          {INVALID_MESSAGE[validation.reason ?? "not_found"]}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
        >
          Back to login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create your account" subtitle="You've been invited to the chapter.">
      <SignupForm inviteToken={invite} />
    </AuthShell>
  );
}
