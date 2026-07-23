import type { EventStatus } from "@/lib/constants";

const LABELS: Record<EventStatus, string> = {
  active: "Active",
  completed: "Completed",
  pending_approval: "Pending",
  cancelled: "Cancelled",
};

const STYLES: Record<EventStatus, string> = {
  active: "bg-green-100 text-green-800",
  completed: "bg-gray-200 text-gray-700",
  pending_approval: "bg-yellow-100 text-yellow-800",
  cancelled: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as EventStatus;
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${STYLES[s] ?? "bg-gray-100 text-gray-600"}`}
    >
      {LABELS[s] ?? status}
    </span>
  );
}
