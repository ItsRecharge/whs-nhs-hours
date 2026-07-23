import Link from "next/link";
import { CalendarCheck, Users } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { getFlash } from "@/lib/flash";
import { FlashMessages } from "@/components/FlashMessages";
import { AccountControls } from "@/components/AccountControls";
import { BrandLogo } from "@/components/BrandLogo";

const NAV = [
  { href: "/organizer/dashboard", label: "My events", icon: CalendarCheck },
  { href: "/organizer/roster", label: "Roster", icon: Users },
];

export default async function OrganizerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("organizer");
  const flash = await getFlash();

  return (
    <div className="min-h-screen">
      <header className="bg-primary-900 text-white shadow">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <BrandLogo
            href="/organizer/dashboard"
            label="Partner Organizer"
            imgClassName="h-8 w-auto"
          />
          <nav className="flex flex-1 items-center justify-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap text-white/85 transition hover:bg-white/10 hover:text-white"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
            <span className="font-medium">{fullName(user)}</span>
            <AccountControls className="text-white/85" align="end" />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <FlashMessages messages={flash} />
        {children}
      </main>
    </div>
  );
}
