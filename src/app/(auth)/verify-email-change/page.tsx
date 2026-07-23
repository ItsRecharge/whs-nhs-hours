import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { verifyEmailChangeAction } from "@/actions/account";

export default async function VerifyEmailChangePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailChangeAction(token) : { ok: false };

  const title = result.ok
    ? "Email updated"
    : result.emailInUse
      ? "Email no longer available"
      : "Verification failed";

  const message = result.ok
    ? "Your sign-in email has been updated. Use the new address next time you log in."
    : result.emailInUse
      ? "That address was taken by another account before you confirmed. Your email was left unchanged."
      : "This link is invalid or has expired. Request the email change again from Settings.";

  return (
    <AuthShell title={title}>
      <p className="text-sm text-gray-600">{message}</p>
      <Link
        href="/login"
        className="mt-5 inline-block rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
      >
        Go to Login
      </Link>
    </AuthShell>
  );
}
