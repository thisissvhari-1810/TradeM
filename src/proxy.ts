import { NextResponse, type NextRequest } from "next/server";

const guarded = ["/terminal", "/portfolio", "/orders", "/journal", "/learn", "/analytics", "/competitions", "/account", "/admin"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api") || pathname.startsWith("/_next")) return NextResponse.next();
  const needsSession = guarded.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (needsSession && !request.cookies.get("tl_session")?.value) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/terminal/:path*", "/portfolio/:path*", "/orders/:path*", "/journal/:path*", "/learn/:path*", "/analytics/:path*", "/competitions/:path*", "/account/:path*", "/admin/:path*", "/terminal", "/portfolio", "/orders", "/journal", "/learn", "/analytics", "/competitions", "/account", "/admin"],
};
