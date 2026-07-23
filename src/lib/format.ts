/** Formats a UTC-midnight event date as a readable label (date-only). */
export function formatEventDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Short label for a timeslot, e.g. "Sat, May 3 · 9:00–11:00". */
export function formatSlot(slot: {
  date: Date;
  startTime: string;
  endTime: string;
}): string {
  return `${formatEventDate(slot.date)} · ${slot.startTime}–${slot.endTime}`;
}
