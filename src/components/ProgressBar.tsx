import { progressColor, progressPct, type ProgressColor } from "@/lib/hours";

const BAR_COLORS: Record<ProgressColor, string> = {
  success: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-red-500",
};

export function ProgressBar({ earned, goal }: { earned: number; goal?: number }) {
  const color = progressColor(earned, goal);
  const pct = progressPct(earned, goal);
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-md bg-gray-200">
      <div
        className={`h-full rounded-md ${BAR_COLORS[color]} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
