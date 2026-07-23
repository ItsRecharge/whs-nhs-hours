import { redirect } from "next/navigation";
import { isFirstRun } from "@/lib/services/setup-service";
import { SetupWizard } from "@/components/SetupWizard";

export const metadata = { title: "Set up your chapter" };

// First-run state lives in the DB, so this must be checked per request.
export const dynamic = "force-dynamic";

export default async function SetupPage() {
  // Authoritative re-run guard: once an officer exists, setup is closed.
  if (!(await isFirstRun())) redirect("/login");

  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2 text-white">
          <span className="text-sm font-bold tracking-[2px] uppercase">
            NHS Hours Log — Setup
          </span>
        </div>
        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <SetupWizard />
        </div>
      </div>
    </div>
  );
}
