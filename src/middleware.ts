import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session-token";

export const config = {
  matcher: ["/member/:path*", "/officer/:path*", "/organizer/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const path = req.nextUrl.pathname;
  const home =
    session.role === "officer"
      ? "/officer/dashboard"
      : session.role === "organizer"
        ? "/organizer/dashboard"
        : "/member/dashboard";

  if (path.startsWith("/officer") && session.role !== "officer") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  if (path.startsWith("/organizer") && session.role !== "organizer") {
    return NextResponse.redirect(new URL(home, req.url));
  }
  if (path.startsWith("/member") && session.role === "organizer") {
    return NextResponse.redirect(new URL(home, req.url));
  }

  return NextResponse.next();
}
