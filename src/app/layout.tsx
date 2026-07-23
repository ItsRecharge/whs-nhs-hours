import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NHS Hours Log",
  description:
    "Track and manage community service hours for the National Honor Society chapter.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      {/* pb-11 reserves space for the fixed attribution bar so nothing sits under it. */}
      <body className="flex min-h-screen flex-col pb-11" suppressHydrationWarning>
        <div className="flex-1">{children}</div>
        <footer className="fixed inset-x-0 bottom-0 z-30 flex h-11 items-center justify-center border-t-2 border-blue-800 bg-[#1d2d35] text-center text-sm font-semibold tracking-wide text-white">
          Designed &amp; built by{" "}
          <span className="ml-1 font-bold text-yellow-400">Neel Bansal</span>
        </footer>
      </body>
    </html>
  );
}
