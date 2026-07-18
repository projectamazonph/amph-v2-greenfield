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
 * The middleware (`src/middleware.ts`) also verifies the JWT for routing
 * decisions (redirecting unauthenticated requests away from `/dashboard`,
 * `/admin`, etc.). Pages verify again here. This is the standard Next
 * pattern: middleware for routing, page for data access. The duplication
 * is by design and is cheap (signed cookie + Web Crypto verify).
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
const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? SESSION_COOKIE_PROD
    : SESSION_COOKIE_DEV;

/** 7 days — matches the Session entity's expected lifetime. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * The JWT payload shape signed by `SignIn.execute()` (STORY-006).
 * Decoded from the session cookie.
 *
 * Must include `sub` (user ID) at minimum. `sessionId` is optional but
 * used by the middleware to attach a request-level session identifier.
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
 */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const { jwt } = buildContainer();
  const result = await jwt.verify(token);
  if (!result.ok) return null;

  const sub = result.value.sub;
  return typeof sub === "string" && sub.length > 0 ? sub : null;
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
    const loginUrl = currentPath
      ? `/login?redirect=${encodeURIComponent(currentPath)}`
      : "/login";
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
 * Set the session cookie. Called by the `SignIn` server action (STORY-006)
 * after a successful password verify.
 *
 * The cookie is:
 * - HttpOnly: not readable from JavaScript (XSS protection)
 * - Secure: in production, only sent over HTTPS
 * - SameSite=Lax: sent on top-level navigations but not cross-site subrequests (CSRF protection)
 * - Path=/: sent to every route
 *
 * `expiresAt` is the JWT's own expiry (typically now + 7 days). The
 * `maxAge` is the cookie's browser-side expiry; both should match.
 */
export async function setAuthCookie(
  token: string,
  expiresAt: Date,
): Promise<void> {
  (await cookies()).set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

/**
 * Clear the session cookie. Called by the `SignOut` server action
 * (STORY-006). Deletes both the dev and prod cookie names so a user
 * who signed in under one environment and is signing out under another
 * doesn't get a stuck cookie.
 */
export async function clearAuthCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  // Also clear the alt name in case the user signed in under a different env
  const altName =
    SESSION_COOKIE === SESSION_COOKIE_PROD
      ? SESSION_COOKIE_DEV
      : SESSION_COOKIE_PROD;
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
  SESSION_COOKIE,
  SESSION_COOKIE_DEV,
  SESSION_COOKIE_PROD,
  COOKIE_MAX_AGE_SECONDS,
} as const;
