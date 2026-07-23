import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { verifySessionToken } from "@/lib/session-token";

export const config = {
  matcher: ["/member/:path*", "/officer/:path*"],
};

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (req.nextUrl.pathname.startsWith("/officer") && session.role !== "officer") {
    return NextResponse.redirect(new URL("/member/dashboard", req.url));
  }

  return NextResponse.next();
}
