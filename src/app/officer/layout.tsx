import Link from "next/link";
import { Wrench } from "lucide-react";
import { requireUser, fullName } from "@/lib/current-user";
import { getFlash } from "@/lib/flash";
import { FlashMessages } from "@/components/FlashMessages";
import { AccountControls } from "@/components/AccountControls";
import { BottomNav } from "@/components/BottomNav";
import { BrandLogo } from "@/components/BrandLogo";
import { DomainRenewalPopup } from "@/components/DomainRenewalPopup";
import { OFFICER_NAV } from "@/lib/nav";
import {
  runDomainReminderCheck,
  shouldShowDomainPopupFor,
  RENEWAL_URL,
  SIGN_IN_EMAIL,
} from "@/lib/domain-reminder";

export default async function OfficerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser("officer");
  const flash = await getFlash();

  // Annual domain-renewal reminder: send this year's email if due, then decide
  // whether to show this officer the renewal popup.
  await runDomainReminderCheck();
  const showDomainPopup = await shouldShowDomainPopupFor(user.id);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar (phones use the top bar + bottom bar) */}
      <aside className="sticky top-0 hidden h-[calc(100vh-2.75rem)] w-[220px] flex-col bg-[#1d2d35] text-white md:flex">
        <div className="px-4 py-5">
          <BrandLogo href="/officer/dashboard" label="Officer Panel" imgClassName="h-8 w-auto" />
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {OFFICER_NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/officer/admin"
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-white/75 transition hover:bg-white/10 hover:text-white"
          >
            <Wrench className="h-4 w-4" />
            Admin
          </Link>
        </nav>
        <div className="border-t border-white/10 px-5 py-4">
          <p className="mb-2 text-xs text-white/60">{fullName(user)}</p>
          <AccountControls className="text-white/75" />
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar: brand left, account flush right */}
        <header className="flex items-start justify-between gap-3 bg-[#1d2d35] px-4 py-3 text-white md:hidden">
          <BrandLogo href="/officer/dashboard" label="Officer Panel" imgClassName="h-7 w-auto" />
          <div className="flex flex-col items-end gap-1 text-sm">
            <span className="font-medium">{fullName(user)}</span>
            <AccountControls className="text-white/85" align="end" />
          </div>
        </header>

        <main className="flex-1 px-4 py-6 pb-32 sm:px-6 sm:py-8 md:pb-8">
          <div className="mx-auto max-w-4xl">
            <FlashMessages messages={flash} />
            {showDomainPopup && (
              <DomainRenewalPopup renewalUrl={RENEWAL_URL} signInEmail={SIGN_IN_EMAIL} />
            )}
            {children}
          </div>
        </main>
      </div>

      <BottomNav variant="officer" />
    </div>
  );
}
