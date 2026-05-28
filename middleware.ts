import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/", "/auth/login", "/auth/register"];
const ADMIN_PREFIX = "/admin";
const TEACHER_PREFIX = "/teacher";
const STUDENT_PREFIX = "/student";

export async function middleware(request: NextRequest) {
  const { response, user, profile } = await updateSession(request);
  const { pathname } = request.nextUrl;

  // Always allow Next.js internals + public assets.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/resend") || // self-serves auth check inside
    pathname === "/favicon.ico"
  ) {
    return response;
  }

  const isPublic =
    PUBLIC_PATHS.includes(pathname) || pathname.startsWith("/auth/");

  // ─── Unauthenticated visitor ────────────────────────────────────────────
  if (!user) {
    if (isPublic) return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // ─── Authenticated, but no profile row yet (race) ───────────────────────
  if (!profile) {
    if (pathname === "/auth/pending") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/pending";
    return NextResponse.redirect(url);
  }

  // ─── Pending / rejected / suspended → holding screen ───────────────────
  if (profile.status !== "approved") {
    if (pathname === "/auth/pending") return response;
    const url = request.nextUrl.clone();
    url.pathname = "/auth/pending";
    return NextResponse.redirect(url);
  }

  // ─── Approved user landing on /auth/* → bounce to dashboard ────────────
  //
  // Exception: /auth/complete-profile is the first-login gate where we
  // collect phone + address. The portal layouts redirect here when those
  // fields are missing, so approved users MUST be allowed through or we'd
  // get an infinite redirect loop:
  //   /admin → redirect(/auth/complete-profile) → middleware bounces to
  //   /dashboard → redirect(/admin) → ...
  if (
    pathname.startsWith("/auth/") &&
    pathname !== "/auth/complete-profile" &&
    pathname !== "/auth/callback"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // ─── Role-based area protection ────────────────────────────────────────
  if (pathname.startsWith(ADMIN_PREFIX) && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith(TEACHER_PREFIX) && profile.role !== "teacher") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  if (pathname.startsWith(STUDENT_PREFIX) && profile.role !== "student") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match every request path except:
     * - Next.js internals (_next/static, _next/image)
     * - Image files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
