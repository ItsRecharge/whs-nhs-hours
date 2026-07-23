import Link from "next/link";

/**
 * The NHS logo as a clickable "home" button. Sits on a white chip so the
 * full-color logo stays legible on the app's dark headers/sidebar.
 */
export function BrandLogo({
  href,
  label,
  className = "",
  imgClassName = "h-7 w-auto",
}: {
  href: string;
  label?: string;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <Link
      href={href}
      aria-label="Go to dashboard"
      className={`inline-flex shrink-0 flex-col items-start gap-1 ${className}`}
    >
      <span className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2 py-1 shadow-sm">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/nhs-logo.png" alt="Aberjona Chapter of the National Honor Society" className={imgClassName} />
        <span className="text-base font-extrabold tracking-tight text-primary-700">NHS</span>
      </span>
      {label ? (
        <span className="text-xs font-semibold tracking-wide text-white/80">{label}</span>
      ) : null}
    </Link>
  );
}
