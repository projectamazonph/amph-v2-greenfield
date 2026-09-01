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
  // Proposal 2: nonce-based CSP. A fresh nonce per request replaces
  // 'unsafe-inline' on script-src. The nonce is threaded to Server
  // Components as the `x-nonce` request header, read via `headers()`
  // wherever an inline `<script>` needs `nonce={nonce}` (see
  // verify-email/page.tsx and certificates/[hash]/page.tsx); Next.js
  // itself auto-applies the same nonce to its own framework-injected
  // inline scripts, but only if the CSP header containing that nonce
  // is present on the *request* headers, not just the response —
  // hence setting it on `requestHeaders` below before constructing
  // the response.
  //
  // Deliberately NOT adding 'strict-dynamic': verified via a real
  // Chromium run (Playwright) against `next dev` that 'strict-dynamic'
  // revokes the 'self' source for every script, including Next's own
  // same-origin `/_next/static/chunks/*` route-loading (loading.tsx)
  // scripts — Turbopack doesn't consistently propagate nonce trust to
  // those dynamically-inserted chunks (a known, still-open pain point
  // across the Next.js/Turbopack ecosystem, not fixable from
  // application code alone), so 'strict-dynamic' broke route loading
  // states across the app. Plain 'self' + nonce avoids that: same-
  // origin chunks stay trusted via 'self' (no strict-dynamic to
  // revoke it), and the two inline scripts we control use the nonce.
  //
  // style-src keeps 'unsafe-inline': this app renders plenty of React
  // inline `style={{...}}` attributes, and a `style` attribute nonce
  // isn't part of the CSP spec (only 'unsafe-inline' or
  // 'unsafe-hashes' cover it) — hardening that would mean migrating
  // every inline style to CSS Modules first, out of scope here.
  // btoa(), not Buffer.from(...).toString("base64") — this file runs on
  // Next.js's Edge Runtime by default (no `export const runtime =
  // "nodejs"`), and btoa is the Web-standard API guaranteed there,
  // vs. relying on Buffer's Edge Runtime polyfill.
  const nonce = btoa(crypto.randomUUID());
  // React 19's RSC streaming runtime uses eval() to decode the
  // `$RS(slot,promise)` payload that moves streamed content out of the
  // hidden `<div id="S:n">` slot on hydration. Without 'unsafe-eval'
  // on script-src, hydration fails silently and every page is stuck on
  // its loading skeleton (confirmed on /admin/resources in dev).
  // Production builds tree-shake the dev eval() shim, so the directive
  // is omitted there to keep the strict Proposal 2 CSP intact.
  const isDev = process.env.NODE_ENV !== "production";
  const cspHeaderValue = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${isDev ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    // https: (not scoped to a single host) because Course.coverImage is a
    // free-text admin-entered URL, not restricted to one CDN — see
    // src/app/courses/page.tsx and src/app/courses/[slug]/page.tsx.
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https://api.paymongo.com https://*.sentry.io https://*.ingest.sentry.io https://*.ingest.us.sentry.io",
    // There was no frame-src directive at all before, so it fell back to
    // default-src 'self' and silently blocked every iframe on the site —
    // the embedded Amazon Ad Console (src/app/tools/ad-console/page.tsx)
    // and the YouTube/Vimeo lesson-video embeds (LessonContent.tsx)
    // included.
    "frame-src 'self' https://amazon-ad-console.vercel.app https://www.youtube.com https://player.vimeo.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeaderValue);

  const res = NextResponse.next({ request: { headers: requestHeaders } });

  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.headers.set("Content-Security-Policy", cspHeaderValue);

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

    const { jwt, sessionRepo } = buildContainer();
    const jwtResult = await jwt.verify(sessionToken);

    if (!jwtResult.ok) {
      // Token invalid or expired — clear cookie + redirect
      const loginPath = pathname.startsWith("/admin") ? "/admin-login" : "/login";
      const loginUrl = new URL(loginPath, request.url);
      const redirectRes = NextResponse.redirect(loginUrl);
      redirectRes.cookies.delete("amph_session");
      redirectRes.cookies.delete("__Secure-amph_session");
      return redirectRes;
    }

    // If the JWT carries a sessionId, verify the session row still exists.
    // This ensures revoked sessions (logout, admin lockout, fraud kill) are
    // rejected immediately — not just when the JWT expires.
    const sessionId = jwtResult.value.sessionId;
    if (typeof sessionId === "string" && sessionId.length > 0) {
      const sessionResult = await sessionRepo.findById(sessionId);
      if (!sessionResult.ok) {
        // Session revoked — clear cookie + redirect
        const loginPath = pathname.startsWith("/admin") ? "/admin-login" : "/login";
        const loginUrl = new URL(loginPath, request.url);
        const redirectRes = NextResponse.redirect(loginUrl);
        redirectRes.cookies.delete("amph_session");
        redirectRes.cookies.delete("__Secure-amph_session");
        return redirectRes;
      }
    }

    // Attach user context to request headers for downstream use
    res.headers.set("x-amph-user-id", String(jwtResult.value.sub));
    res.headers.set("x-amph-session-id", String(sessionId ?? ""));
    res.headers.set("x-amph-role", String(jwtResult.value.role ?? "STUDENT"));

    // 2FA enforcement for admin routes (STORY-ops-2fa-enforce / #413)
    // If user is accessing admin routes and requires2FA is true, verify 2FA is enabled
    if (pathname.startsWith("/admin")) {
      const { userRepo } = buildContainer();
      const userResult = await userRepo.findById(jwtResult.value.sub);
      if (userResult.ok && userResult.value.requires2FA && !userResult.value.twoFactorEnabled) {
        // User is required to have 2FA but doesn't have it enabled
        // Redirect to 2FA enrollment flow
        const setupUrl = new URL("/admin/settings/2fa-setup", request.url);
        setupUrl.searchParams.set("redirect", pathname);
        return NextResponse.redirect(setupUrl);
      }
    }
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
