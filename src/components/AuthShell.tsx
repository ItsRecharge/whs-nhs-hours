import Link from "next/link";
import { Award } from "lucide-react";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="hero-gradient flex min-h-screen items-center justify-center px-4 py-10">
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-6 flex flex-col items-center justify-center gap-1 text-white">
          <span className="flex items-center gap-2">
            <Award className="h-6 w-6 text-accent-400" />
            <span className="text-sm font-bold tracking-[2px] uppercase">
              Aberjona NHS
            </span>
          </span>
          <span className="text-[11px] font-medium tracking-wide text-white/70">
            Aberjona Chapter of the National Honor Society
          </span>
        </Link>

        <div className="rounded-2xl bg-white p-8 shadow-2xl">
          <h1 className="text-2xl font-extrabold text-gray-900">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
          <div className="mt-6">{children}</div>
        </div>

        {footer && <div className="mt-5 text-center text-sm text-white/80">{footer}</div>}
      </div>
    </div>
  );
}

export const fieldClass =
  "w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-primary-700 focus:ring-2 focus:ring-primary-200";

export const labelClass = "mb-1 block text-sm font-medium text-gray-700";
