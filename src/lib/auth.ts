/**
 * src/lib/auth.ts — server-side session helpers.
 *
 * STORY-046-prep-2.
 *
 * These helpers are the only sanctioned way for server components, layouts,
 * and server actions to read the current session. They:
 *
 * 1. Read the `amph_session` (or `__Secure-amph_session` in production) HttpOnly
 *    cookie via `next/headers`.
 * 2. Verify the JWT via the container's `JwtService` (JoseJwtService in prod,
 *    same in test).
 * 3. Optionally load the full `User` entity via `userRepo.findById()`.
 *
 * The proxy (`src/proxy.ts`, formerly `src/middleware.ts` before Next 16)
 * also verifies the JWT for routing decisions (redirecting unauthenticated
 * requests away from `/dashboard`, `/admin`, etc.). Pages verify again
 * here. This is the standard Next pattern: proxy/middleware for routing,
 * page for data access. The duplication is by design and is cheap
 * (signed cookie + Web Crypto verify).
 *
 * `import "server-only"` at the top ensures these helpers cannot be
 * imported from a client component — they would throw at build time.
 *
 * Companion use cases (STORY-006, not yet built):
 * - `SignIn.execute()` should call `setAuthCookie(token, expiresAt)`
 * - `SignOut.execute()` should call `clearAuthCookie()`
 *
 * Without STORY-006, no cookie is set after signup. This is a known
 * pre-existing gap, not introduced here.
 */

import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User } from "@/domain/entities/User";
import { buildContainer } from "@/composition/container";

const SESSION_COOKIE_DEV = "amph_session";
const SESSION_COOKIE_PROD = "__Secure-amph_session";

const ADMIN_SESSION_COOKIE_DEV = "amph_admin_session";
const ADMIN_SESSION_COOKIE_PROD = "__Secure-amph_admin_session";

/**
 * Read the session cookie name from the CURRENT env. This is a
 * per-call function (not a module-level constant) so that flipping
 * NODE_ENV after import takes effect immediately.
 *
 * Why not a constant: the previous implementation captured at
 * module load, which locked the cookie name on first import. In
 * tests that set NODE_ENV=production partway through, this was a
 * silent bug. Reading at call time is cheap (one string compare)
 * and matches the user's mental model.
 *
 * The `__Secure-` prefix is enforced by browsers: a cookie whose
 * name starts with `__Secure-` is dropped unless the `Secure` flag
 * is set. Since HTTPS-only cookies can't be set over HTTP (test
 * environments), we MUST use the dev name in HTTP contexts even
 * when NODE_ENV=production. Pass the request protocol's `isHttps`
 * flag from the route handler; if omitted, fall back to the
 * env-based default (correct for server actions and pages, where
 * the request protocol isn't directly available).
 */
export function getSessionCookieName(isHttps?: boolean): string {
  if (typeof isHttps === "boolean") {
    return isHttps ? SESSION_COOKIE_PROD : SESSION_COOKIE_DEV;
  }
  return process.env.NODE_ENV === "production" ? SESSION_COOKIE_PROD : SESSION_COOKIE_DEV;
}

/**
 * Same HTTPS-aware pattern as `getSessionCookieName` but for the admin
 * impersonation cookie. The `__Secure-` prefix mirrors the same constraint
 * (browsers require HTTPS when the Secure flag is set). Single source of
 * truth prevents the secure/name drift bug seen in S3.
 */
export function getAdminSessionCookieName(isHttps?: boolean): string {
  if (typeof isHttps === "boolean") {
    return isHttps ? ADMIN_SESSION_COOKIE_PROD : ADMIN_SESSION_COOKIE_DEV;
  }
  return process.env.NODE_ENV === "production" ? ADMIN_SESSION_COOKIE_PROD : ADMIN_SESSION_COOKIE_DEV;
}

/** 7 days — matches the Session entity's expected lifetime. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * The JWT payload shape signed by `SignIn.execute()` (STORY-006).
 * Decoded from the session cookie.
 *
 * Must include `sub` (user ID) at minimum. `sessionId` is optional but
 * used by the proxy (formerly middleware) to attach a request-level
 * session identifier.
 */
export interface SessionClaims {
  sub: string;
  sessionId?: string;
  role?: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  iat?: number;
  exp?: number;
}

/**
 * Read and verify the session cookie. Returns the user ID if valid,
 * null otherwise. Never throws.
 *
 * SECURITY: After the JWT crypto check succeeds, we verify the session
 * record still exists in the database. This ensures that server-side
 * session revocation (logout, admin lockout, "logout everywhere") takes
 * effect immediately instead of waiting for the JWT to expire.
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(getSessionCookieName())?.value;
  if (!token) return null;

  const { jwt, sessionRepo } = buildContainer();
  const result = await jwt.verify(token);
  if (!result.ok) return null;

  const sub = result.value.sub;
  if (typeof sub !== "string" || sub.length === 0) return null;

  // If the JWT carries a sessionId, verify it still exists server-side.
  // If the session was deleted (logout, admin revocation), reject the token.
  const sessionId = result.value.sessionId;
  if (typeof sessionId === "string" && sessionId.length > 0) {
    const sessionResult = await sessionRepo.findById(sessionId);
    if (!sessionResult.ok) return null;
  }

  return sub;
}

/**
 * Read the session cookie and load the full User entity.
 * Returns null if not authenticated OR the user no longer exists in the DB
 * (e.g., account was deleted while a valid JWT was still in flight).
 */
export async function getSessionUser(): Promise<User | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const { userRepo } = buildContainer();
  const result = await userRepo.findById(userId);
  if (!result.ok) return null;
  return result.value;
}

/**
 * Page-level guard. Use at the top of a server component / layout to
 * require an authenticated user. Redirects to `/login` if not.
 *
 * The `currentPath` argument, if provided, becomes the `redirect` query
 * param on the login page so the user lands back where they were after
 * signing in. Pass via `headers().get('x-pathname')` or similar.
 */
export async function requireAuth(currentPath?: string): Promise<User> {
  const user = await getSessionUser();
  if (!user) {
    const loginUrl = currentPath ? `/login?redirect=${encodeURIComponent(currentPath)}` : "/login";
    redirect(loginUrl);
  }
  return user;
}

/**
 * Page-level guard. Requires an authenticated user with `role === 'ADMIN'`.
 * Redirects to `/login` if not authenticated, `/dashboard?error=forbidden`
 * if authenticated but not admin.
 *
 * Use at the top of every `/admin/*` page.
 */
export async function requireAdmin(currentPath?: string): Promise<User> {
  const user = await requireAuth(currentPath);
  if (user.role !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }
  return user;
}

/**
 * The shape we need to set a cookie on. Matches both the response object
 * returned by `NextResponse.redirect()` (a `NextResponse` whose `.cookies`
 * is a `ResponseCookies`) and the `cookies()` store from `next/headers`
 * (a `RequestCookies`). We type it as a structural subset so we can pass
 * either interchangeably.
 *
 * Story 066 follow-up: in Route Handlers that return `NextResponse.redirect()`,
 * cookies set via the `cookies()` store go to the *implicit* response and
 * are LOST — the returned NextResponse is a fresh response. Passing the
 * returned response in here lets us set cookies directly on it.
 */
interface CookieTarget {
  set: (cookie: {
    name: string;
    value: string;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
    path?: string;
    expires?: Date;
    maxAge?: number;
  }) => void;
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  // Secure flag is decided at call time, not module load. The default
  // (true in production) is correct for Vercel deployments, but
  // tests/E2E run `next start` (NODE_ENV=production) over HTTP
  // localhost — the browser drops Secure cookies on http, so the
  // session never round-trips. Route Handlers know the actual request
  // protocol and pass an override.
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE_SECONDS,
};

/**
 * Set the session cookie. Called by the `SignIn` server action (STORY-006)
 * after a successful password verify, AND by the `/api/auth/login` and
 * `/api/auth/signup` Route Handlers (STORY-066) on a successful response.
 *
 * The cookie is:
 * - HttpOnly: not readable from JavaScript (XSS protection)
 * - Secure: only sent over HTTPS, unless overridden via `secure` for
 *   environments that run over HTTP (e.g. Playwright's `next start`
 *   against `http://localhost:3000`).
 * - SameSite=Lax: sent on top-level navigations but not cross-site subrequests (CSRF protection)
 * - Path=/: sent to every route
 *
 * `expiresAt` is the JWT's own expiry (typically now + 7 days). The
 * `maxAge` is the cookie's browser-side expiry; both should match.
 *
 * If `target` is provided, the cookie is set on it directly. This is the
 * Route Handler case: a handler creates a `NextResponse.redirect()` and
 * needs the cookie to travel with that response. If `target` is omitted,
 * the cookie is set on the request's `cookies()` store (the default for
 * server actions and pages).
 *
 * `secure` and `cookieName` MUST agree. The `__Secure-` prefix is
 * enforced by browsers — a cookie starting with `__Secure-` is dropped
 * unless the Secure flag is set. So the cookie name and the Secure flag
 * are derived together from the same `isHttps` signal. If you only pass
 * one, the other stays at its NODE_ENV-based default, which is wrong on
 * HTTP. Always pass both, or neither.
 */
export async function setAuthCookie(
  token: string,
  expiresAt: Date,
  target?: CookieTarget,
  options?: { secure?: boolean; isHttps?: boolean },
): Promise<void> {
  // Derive both the Secure flag and the cookie name from a single `isHttps`
  // signal. The two MUST agree — browsers enforce that a `__Secure-` cookie
  // is dropped unless Secure is set, and a non-prefixed cookie with Secure
  // set cannot be set over HTTP. Compute both from the same source.
  const isHttps = options?.isHttps ?? SESSION_COOKIE_OPTIONS.secure;
  const secure = options?.secure ?? isHttps;
  const name = getSessionCookieName(isHttps);
  const cookie = {
    name,
    value: token,
    httpOnly: SESSION_COOKIE_OPTIONS.httpOnly,
    secure,
    sameSite: SESSION_COOKIE_OPTIONS.sameSite,
    path: SESSION_COOKIE_OPTIONS.path,
    maxAge: SESSION_COOKIE_OPTIONS.maxAge,
    expires: expiresAt,
  };
  if (target) {
    target.set(cookie);
    return;
  }
  (await cookies()).set(cookie);
}

/**
 * Clear the session cookie. Called by the `SignOut` server action
 * (STORY-006) and the `/api/auth/logout` Route Handler (STORY-066).
 *
 * Deletes both the dev and prod cookie names so a user who signed in
 * under one environment and is signing out under another doesn't get
 * a stuck cookie.
 *
 * If `target` is provided, the cookies are deleted from it directly
 * (Route Handler case — see `setAuthCookie` for the rationale).
 */
export async function clearAuthCookie(target?: CookieTarget): Promise<void> {
  // Read the current env's cookie name at call time, not module load.
  const currentName = getSessionCookieName();
  const altName = currentName === SESSION_COOKIE_PROD ? SESSION_COOKIE_DEV : SESSION_COOKIE_PROD;

  if (target) {
    target.set({ name: currentName, value: "", path: "/" });
    target.set({ name: altName, value: "", path: "/" });
    return;
  }
  const jar = await cookies();
  jar.delete(currentName);
  jar.delete(altName);
}

/**
 * Exported for tests. The cookie name is determined by NODE_ENV at
 * module-load time, which makes it hard to test the prod cookie path
 * in a test that runs in a dev NODE_ENV. Tests should set
 * `process.env.NODE_ENV = "production"` before importing this module
 * (or before calling `setAuthCookie`) if they want to exercise the
 * `__Secure-amph_session` name.
 */
export const _testInternals = {
  SESSION_COOKIE_DEV,
  SESSION_COOKIE_PROD,
  COOKIE_MAX_AGE_SECONDS,
  /** The current env's cookie name (per-call, not module-load). */
  getCurrentSessionCookieName: getSessionCookieName,
} as const;
