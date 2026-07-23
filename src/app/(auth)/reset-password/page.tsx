import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { ResetForm } from "./ResetForm";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell title="Invalid reset link">
        <p className="text-sm text-gray-600">
          This link is missing its token. Request a new password reset.
        </p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-indigo-700 hover:underline"
        >
          Request a reset link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Set a new password">
      <ResetForm token={token} />
    </AuthShell>
  );
}
