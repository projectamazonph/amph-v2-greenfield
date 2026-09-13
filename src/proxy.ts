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

const PROTECTED_PREFIXES = ["/dashboard/", "/admin/"];
const PROTECTED_EXACT = ["/dashboard"];

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

/** Paths that the maintenance-mode 503 page itself lives under. */
const MAINTENANCE_PAGE_PREFIXES = ["/maintenance"];

function isMaintenancePagePath(pathname: string): boolean {
  return MAINTENANCE_PAGE_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * P1-08 (P4 PR-A): maintenance-mode kill switch decision.
 *
 * Order of precedence — strictest first, so the env kill switch
 * always wins even if the DB is on fire:
 *
 *   1. `MAINTENANCE_MODE` env var === "true" -> 503 for everyone,
 *      no bypass, no DB read. The emergency kill switch the brief
 *      asks for; flipping it does not require touching the DB.
 *   2. `MAINTENANCE_BYPASS_TOKEN` cookie matches the same env var
 *      -> let the request through. The brief-recommended escape
 *      hatch: paste the token into the browser cookie store and
 *      keep working.
 *   3. DB-backed toggle via `getMaintenanceStatus`:
 *      - enabled + admin role JWT -> let through (the admin
 *        override). The JWT role is read from the cookie just
 *        like the existing route-protection block does, so no new
 *        auth surface is added.
 *      - enabled + no role (or non-admin) -> 503.
 *      - disabled -> let through.
 *
 * Any DB read failure degrades to "site is up" -- a transient DB
 * outage must not lock everyone out via a hard 503.
 */
async function checkMaintenanceMode(
  request: NextRequest,
): Promise<NextResponse | null> {
  // The maintenance page itself is always reachable so the user
  // sees the explanation.
  if (isMaintenancePagePath(request.nextUrl.pathname)) return null;

  // 1. Emergency env kill switch.
  if (process.env.MAINTENANCE_MODE === "true") {
    return NextResponse.rewrite(new URL("/maintenance", request.url), {
      status: 503,
    });
  }

  // 2. Bypass-token cookie. Compared in constant time so a guessed
  //    half-token can't be timed. Empty env var means the bypass
  //    is disabled -- matching the dev default.
  const bypassToken = process.env.MAINTENANCE_BYPASS_TOKEN ?? "";
  if (bypassToken.length > 0) {
    const cookieValue =
      request.cookies.get("amph_maintenance_bypass")?.value ?? "";
    if (
      cookieValue.length > 0 &&
      timingSafeEqual(cookieValue, bypassToken)
    ) {
      return null;
    }
  }

  // 3. DB-backed toggle.
  const { getMaintenanceStatus } = buildContainer();
  const statusResult = await getMaintenanceStatus.execute();
  // Degrade gracefully on DB errors: "the site is up" rather than
  // locking everyone out via a hard 503 from a transient outage.
  if (!statusResult.ok) return null;
  if (!statusResult.value.enabled) return null;

  // Admin override: read the role from the JWT exactly the same way
  // the route-protection block does below. We don't re-verify the
  // session row here -- the bypass is best-effort (the proxy does the
  // full check in the next stage); this is just to keep an admin's
  // browser functional during an incident while a non-admin's browser
  // is locked out.
  const role = await readRoleFromCookie(request);
  if (role === "ADMIN") return null;

  return NextResponse.rewrite(new URL("/maintenance", request.url), {
    status: 503,
  });
}

/** Constant-time string comparison; same length and bytes -> match. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Best-effort role read from the session JWT, without re-fetching
 * the user row. Returns null on any decode error. Used only to
 * decide the admin override during maintenance; the authoritative
 * role check still happens in the route-protection block.
 */
async function readRoleFromCookie(request: NextRequest): Promise<string | null> {
  const sessionToken =
    request.cookies.get("amph_session")?.value ??
    request.cookies.get("__Secure-amph_session")?.value;
  if (!sessionToken) return null;
  const secret = process.env.JWT_SECRET;
  if (!secret) return null;
  try {
    const { jwt } = buildContainer();
    const r = await jwt.verify(sessionToken);
    if (!r.ok) return null;
    return typeof r.value.role === "string" ? r.value.role : null;
  } catch {
    return null;
  }
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

  // ── Maintenance mode (P1-08) ─────────────────────────────
  // Must run before route protection so a maintenance-on request
  // never accidentally triggers a redirect to /login. Admin
  // override is decided here using the JWT role, so an admin
  // browser stays functional during an incident.
  const maintenanceResponse = await checkMaintenanceMode(request);
  if (maintenanceResponse) return maintenanceResponse;

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
