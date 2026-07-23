import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { verifyEmailAction } from "@/actions/signup";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const verified = token ? await verifyEmailAction(token) : false;

  return (
    <AuthShell title={verified ? "Email verified" : "Verification failed"}>
      <p className="text-sm text-gray-600">
        {verified
          ? "Your email has been verified. You can now log in to your account."
          : "This verification link is invalid or has expired. Try logging in to request a new one."}
      </p>
      <Link
        href="/login"
        className="mt-5 inline-block rounded-md bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800"
      >
        Go to Login
      </Link>
    </AuthShell>
  );
}
