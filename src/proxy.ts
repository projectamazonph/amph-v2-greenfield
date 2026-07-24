/**
 * Next.js proxy — Story 004 / 013.
 *
 * Runs on every request before it reaches the page or API route.
 * (Renamed from middleware.ts per Next 16 — see
 * https://nextjs.org/docs/messages/middleware-to-proxy.)
 *
 * Responsibilities:
 * - Security headers (always)
 * - Route protection (redirect unauthenticated users from /dashboard, /admin)
 * - JWT session verification (Story 013)
 *
 * Note: `/` is the public marketing landing page (PR #110). It must
 * render for unauthenticated visitors — the proxy never redirects
 * the root. Earlier versions of this file did redirect `/` to
 * `/signup`, which made the landing page unreachable and broke
 * Lighthouse. The landing page itself includes sign-up CTAs; the
 * proxy must not pre-empt that decision.
 *
 * The session cookie is httpOnly, secure, sameSite=lax.
 * JWT payload: { sub: userId, sessionId, role: string }
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildContainer } from "@/composition/container";

const PROTECTED_PREFIXES = ["/dashboard/", "/admin/", "/enroll/", "/order/"];
const PROTECTED_EXACT = ["/dashboard", "/enroll", "/order"];

/** Paths that look like /admin but are the admin login page itself. */
const ADMIN_LOGIN_PREFIXES = ["/admin-login", "/api/auth/admin-login"];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_EXACT.includes(pathname)) return true;
  if (pathname === "/admin") return true; // bare /admin → admin login
  if (PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function isAdminLoginPath(pathname: string): boolean {
  return ADMIN_LOGIN_PREFIXES.some((p) => pathname.startsWith(p));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Security headers ──────────────────────────────────────
  const res = NextResponse.next();

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // ── Route protection ─────────────────────────────────────
  const isProtected = isProtectedPath(pathname) && !isAdminLoginPath(pathname);

  if (isProtected) {
    const sessionToken =
      request.cookies.get("amph_session")?.value ??
      request.cookies.get("__Secure-amph_session")?.value;

    if (!sessionToken) {
      // Admin routes → admin login. Other routes → regular login.
      const loginPath = pathname.startsWith("/admin") ? "/admin-login" : "/login";
      const loginUrl = new URL(loginPath, request.url);
      if (loginPath === "/login") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }

    // Story 013: verify JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      // Server misconfigured — deny all
      return new NextResponse("Internal server error", { status: 500 });
    }

    const jwt = buildContainer().jwt;
    const result = await jwt.verify(sessionToken);

    if (!result.ok) {
      // Token invalid or expired — clear cookie + redirect
      const loginPath = pathname.startsWith("/admin") ? "/admin-login" : "/login";
      const loginUrl = new URL(loginPath, request.url);
      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.cookies.delete("amph_session");
      redirectRes.cookies.delete("__Secure-amph_session");
      return redirectRes;
    }

    // Attach user context to request headers for downstream use
    res.headers.set("x-amph-user-id", String(result.value.sub));
    res.headers.set("x-amph-session-id", String(result.value.sessionId));
    res.headers.set("x-amph-role", String(result.value.role ?? "STUDENT"));
  }

  // No root redirect: `/` is the public marketing landing page
  // and must render for unauthenticated visitors.

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
