import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  const user = token ? await verifySessionToken(token) : null;

  const isAuthRoute = request.nextUrl.pathname.startsWith("/api/auth");
  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isPublicRoute =
    request.nextUrl.pathname === "/" ||
    request.nextUrl.pathname.startsWith("/ringkasan") ||
    (request.nextUrl.pathname.startsWith("/api/trips/") &&
      request.nextUrl.pathname.endsWith("/report")) ||
    isAuthRoute ||
    isLoginRoute;

  if (!user && !isPublicRoute) {
    const redirectUrl = new URL("/login", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isLoginRoute) {
    const redirectUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
