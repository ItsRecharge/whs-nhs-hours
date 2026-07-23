import { Award } from "lucide-react";

/**
 * Minimal standalone chrome for public organizer pages: no navigation, no
 * links into the rest of the app.
 */
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="bg-primary-900 text-white shadow">
        <div className="mx-auto flex max-w-4xl items-center gap-2 px-4 py-3">
          <Award className="h-5 w-5 text-accent-400" />
          <span className="text-sm font-bold tracking-[2px] uppercase">
            Aberjona NHS
          </span>
          <span className="ml-auto rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-semibold text-white/80">
            Organizer view
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
