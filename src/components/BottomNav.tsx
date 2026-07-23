"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MEMBER_NAV, OFFICER_NAV } from "@/lib/nav";

/** Fixed bottom tab bar for phones. Hidden on md+ where the top nav/sidebar shows. */
export function BottomNav({ variant }: { variant: "member" | "officer" }) {
  const pathname = usePathname();
  const items = variant === "officer" ? OFFICER_NAV : MEMBER_NAV;

  return (
    <nav className="fixed inset-x-0 bottom-11 z-40 flex border-t border-black/10 bg-white shadow-[0_-1px_6px_rgba(0,0,0,0.08)] md:hidden">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors ${
              active ? "text-indigo-700" : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <item.icon className="h-5 w-5" />
            <span className="leading-none">{item.short}</span>
          </Link>
        );
      })}
    </nav>
  );
}
