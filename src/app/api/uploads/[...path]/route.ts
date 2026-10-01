import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { getCurrentUser } from "@/lib/current-user";
import { db } from "@/lib/db";
import { resolveUploadPath, contentTypeForPath } from "@/lib/uploads";

/**
 * Serves hour-report proof photos with auth done in-handler (this route is
 * outside the middleware matcher): officers see everything, members only the
 * photos on their own reports, organizers nothing.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const relPath = (await params).path.join("/");

  if (user.role !== "officer") {
    if (user.role !== "member") {
      return new NextResponse("Forbidden", { status: 403 });
    }
    const owns = await db.hourReport.findFirst({
      where: { userId: user.id, photoPath: relPath },
      select: { id: true },
    });
    if (!owns) return new NextResponse("Forbidden", { status: 403 });
  }

  const abs = resolveUploadPath(relPath);
  if (!abs) return new NextResponse("Not found", { status: 404 });

  const body = await readFile(abs);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": contentTypeForPath(relPath),
      "Cache-Control": "private, max-age=3600",
    },
  });
}
