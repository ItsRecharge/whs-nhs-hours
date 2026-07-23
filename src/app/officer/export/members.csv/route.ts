import { getCurrentUser } from "@/lib/current-user";
import { listMembersWithProgress } from "@/lib/services/member-service";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const yn = (v: boolean) => (v ? "yes" : "no");

/** Officer-only CSV of every member's cumulative hours standing. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "officer") {
    return new Response("Forbidden", { status: 403 });
  }

  const members = await listMembersWithProgress();
  const dateLabel = new Date().toISOString().slice(0, 10);

  const header = [
    "First name",
    "Last name",
    "Email",
    "Graduation year",
    "House",
    "Inside hours",
    "Outside hours",
    "Outside counted",
    "Total hours",
    "Hours remaining",
    "Tutoring",
    "Soup kitchen",
    "Gardening",
    "Status",
  ];
  const rows = members.map((m) =>
    [
      m.firstName,
      m.lastName,
      m.email,
      m.graduationYear ?? "",
      m.house?.name ?? "",
      m.breakdown.inside,
      m.breakdown.outside,
      m.breakdown.outsideCounted,
      m.earned,
      m.remaining,
      yn(m.breakdown.requirements.tutoring),
      yn(m.breakdown.requirements.soupKitchen),
      yn(m.breakdown.requirements.gardening),
      m.deactivatedAt ? "inactive" : m.emailVerifiedAt ? "verified" : "unverified",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nhs-hours-${dateLabel}.csv"`,
    },
  });
}
