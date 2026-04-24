import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME, readAuthToken } from "@/lib/auth";

const publicPaths = ["/login", "/api/auth/login"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  const isPublicPath = publicPaths.some((path) => pathname === path);
  const authUser = await readAuthToken(
    request.cookies.get(AUTH_COOKIE_NAME)?.value,
  );
  const isAuthenticated = Boolean(authUser);

  if (!isAuthenticated && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && pathname === "/login") {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  if (pathname.startsWith("/settings") && authUser?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  if (pathname.startsWith("/dashboard") && !["ADMIN", "MANAGER"].includes(authUser?.role ?? "")) {
    return NextResponse.redirect(new URL("/orders", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
