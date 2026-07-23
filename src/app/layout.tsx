import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aberjona NHS — Hours Log",
  description:
    "Track and manage community service hours for the Aberjona Chapter of the National Honor Society at Winchester High School.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* pb-11 reserves space for the fixed attribution bar so nothing sits under it. */}
      <body className="flex min-h-screen flex-col pb-11" suppressHydrationWarning>
        <div className="flex-1">{children}</div>
        <footer className="fixed inset-x-0 bottom-0 z-30 flex h-11 items-center justify-center border-t-2 border-accent-500 bg-primary-950 text-center text-sm font-semibold tracking-wide text-white">
          Designed &amp; built by{" "}
          <span className="ml-1 font-bold text-accent-400">Neel Bansal</span>
        </footer>
      </body>
    </html>
  );
}
