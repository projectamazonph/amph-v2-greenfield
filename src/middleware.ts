/**
 * Next.js middleware — Story 004.
 *
 * Runs on every request before it reaches the page or API route.
 * Responsibilities:
 * - Security headers
 * - Session token validation
 * - Route protection (redirect unauthenticated users from /dashboard, /admin)
 *
 * The session cookie is httpOnly, secure, sameSite=strict, and set by the
 * login flow (STORY-007). This middleware only validates it.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard", "/admin", "/enroll", "/order"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Security headers ──────────────────────────────────────
  const res = NextResponse.next();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );

  // ── Route protection ─────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((p) =>
    pathname.startsWith(p),
  );

  if (isProtected) {
    const sessionToken =
      request.cookies.get("amph_session")?.value ??
      request.cookies.get("__Secure-amph_session")?.value;

    if (!sessionToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // TODO (STORY-007): Validate the session token against the database.
    // For now, any non-empty token grants access (framework scaffolding).
    // Real implementation: decode JWT, check expiry, verify against Session table.
  }

  // ── Redirect root to signup ───────────────────────────────
  if (pathname === "/") {
    return NextResponse.redirect(new URL("/signup", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
