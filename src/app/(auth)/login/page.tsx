import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { isFirstRun } from "@/lib/services/setup-service";
import { LoginForm } from "./LoginForm";

// isFirstRun() queries the DB per-request; searchParams are always dynamic.
export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (await isFirstRun()) redirect("/setup");
  const { next } = await searchParams;
  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your chapter account.">
      <LoginForm next={next} />
    </AuthShell>
  );
}
