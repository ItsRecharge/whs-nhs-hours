import { getCurrentUser } from "@/lib/current-user";
import { listMembersWithProgress } from "@/lib/services/member-service";
import { schoolYearRange } from "@/lib/hours";

function csvCell(value: string | number | null | undefined): string {
  const s = value == null ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Officer-only CSV of every member's hours for the current school year. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "officer") {
    return new Response("Forbidden", { status: 403 });
  }

  const members = await listMembersWithProgress();
  const { start, end } = schoolYearRange();
  const yearLabel = `${start.getUTCFullYear()}-${end.getUTCFullYear()}`;

  const header = [
    "First name",
    "Last name",
    "Email",
    "Graduation year",
    "Hours earned",
    "Hours remaining",
    "Status",
  ];
  const rows = members.map((m) =>
    [
      m.firstName,
      m.lastName,
      m.email,
      m.graduationYear ?? "",
      m.earned,
      m.remaining,
      m.deactivatedAt ? "inactive" : m.emailVerifiedAt ? "verified" : "unverified",
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.map(csvCell).join(","), ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nhs-hours-${yearLabel}.csv"`,
    },
  });
}
