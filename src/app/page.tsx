import Link from "next/link";
import { redirect } from "next/navigation";
import { Award, KeyRound, LogIn } from "lucide-react";
import { isFirstRun } from "@/lib/services/setup-service";

const DECO_MARKS = [
  { size: "9rem", style: { top: "4%", left: "2%", transform: "rotate(-18deg)" } },
  { size: "14rem", style: { bottom: "-2%", right: "3%", transform: "rotate(12deg)" } },
  { size: "5rem", style: { top: "28%", right: "12%", transform: "rotate(-5deg)" } },
  { size: "4rem", style: { bottom: "20%", left: "8%", transform: "rotate(25deg)" } },
];

// The first-run redirect depends on live DB state, not build-time state.
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  if (await isFirstRun()) redirect("/setup");

  return (
    <div className="hero-gradient flex min-h-screen items-center">
      {DECO_MARKS.map((mark, i) => (
        <Award
          key={i}
          className="deco-note"
          style={{ width: mark.size, height: mark.size, ...mark.style }}
        />
      ))}

      <div className="relative z-10 mx-auto w-full max-w-2xl px-4 text-center">
        <span className="mb-4 inline-block text-xs font-bold tracking-[2px] text-accent-300 uppercase">
          Aberjona Chapter &middot; National Honor Society
        </span>

        <div className="mb-2 flex justify-center">
          <Award className="h-12 w-12 text-accent-400" />
        </div>

        <h1 className="text-5xl leading-tight font-black tracking-tight text-white">
          Aberjona NHS
        </h1>
        <h2 className="mt-1 text-2xl font-light tracking-[2px] text-white/70 uppercase">
          Hours Log
        </h2>

        <div className="mx-auto my-5 h-[3px] w-12 rounded bg-accent-400" />

        <p className="mx-auto mb-12 max-w-md leading-relaxed text-white/75">
          Track and manage community service hours for the Aberjona chapter at
          Winchester High School.
        </p>

        <div className="mx-auto mb-6 grid max-w-md grid-cols-2 gap-4">
          <Link href="/login" className="glass-card block px-5 pt-8 pb-7 text-white">
            <LogIn className="mx-auto mb-3 h-10 w-10 opacity-90" />
            <div className="text-base font-extrabold tracking-wider uppercase">
              Log In
            </div>
            <div className="mt-1 text-xs text-white/60">Members &amp; officers</div>
          </Link>
          <Link href="/signup" className="glass-card block px-5 pt-8 pb-7 text-white">
            <KeyRound className="mx-auto mb-3 h-10 w-10 opacity-90" />
            <div className="text-base font-extrabold tracking-wider uppercase">
              Sign Up
            </div>
            <div className="mt-1 text-xs text-white/60">Invite link required</div>
          </Link>
        </div>

        <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs tracking-wide text-white/65">
          <KeyRound className="h-3.5 w-3.5" />
          Invite-only chapter access
        </span>
      </div>
    </div>
  );
}
