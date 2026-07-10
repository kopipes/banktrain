import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

// Routes that require authentication
const protectedPrefixes = ["/dashboard", "/admin", "/studio", "/feed", "/library", "/challenges"];
// Routes only for non-authenticated users
const authRoutes = ["/login"];
// Admin-only routes
const adminPrefixes = ["/admin"];
// Mentor or admin routes
const mentorPrefixes = ["/challenges/manage"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth();

  const isProtected = protectedPrefixes.some((p) => pathname.startsWith(p));
  const isAuthRoute = authRoutes.some((p) => pathname.startsWith(p));

  // Redirect logged-in users away from login page
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Redirect unauthenticated users to login
  if (isProtected && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = (session?.user as { role?: string })?.role;

  // Admin-only protection
  if (adminPrefixes.some((p) => pathname.startsWith(p)) && role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Mentor/admin protection
  if (
    mentorPrefixes.some((p) => pathname.startsWith(p)) &&
    role !== "admin" &&
    role !== "mentor"
  ) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|uploads).*)",
  ],
};
