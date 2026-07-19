/**
 * stopImpersonatingAction — admin server action to end an impersonation
 * session and restore the admin's original session.
 *
 * STORY-047: Admin user detail + impersonate.
 *
 * Flow:
 *  1. Read the admin's backup token from `amph_admin_session` cookie
 *  2. Plant it back as the session cookie
 *  3. Delete the backup cookie
 *  4. Return success
 *
 * If there's no backup cookie (first-time impersonation didn't capture
 * one — see TODO in impersonateUser.action.ts), we fall back to
 * `clearAuthCookie()` so the user is at least signed out instead of
 * stuck impersonating.
 *
 * Testable pure logic: `performStopImpersonating` (below). Action
 * wrapper: thin shell.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { setAuthCookie, clearAuthCookie } from "@/lib/auth";

export type StopImpersonatingActionError =
  | { kind: "no_admin_session" }
  | { kind: "db_error"; message: string };

export type StopImpersonatingActionResult = Result<
  { restored: boolean },
  StopImpersonatingActionError
>;

function getAdminSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-amph_admin_session"
    : "amph_admin_session";
}

export async function performStopImpersonating(deps: {
  cookies: {
    get: (name: string) => { value: string } | undefined;
    delete: (name: string) => void;
  };
  setSessionCookie: typeof setAuthCookie;
  clearSessionCookie: typeof clearAuthCookie;
  expiresAt: Date; // the expiresAt the admin's original token should have
}): Promise<StopImpersonatingActionResult> {
  const backup = deps.cookies.get(getAdminSessionCookieName());
  if (!backup?.value) {
    // No backup — fall back to clearing the session (sign out the user)
    await deps.clearSessionCookie();
    deps.cookies.delete(getAdminSessionCookieName());
    return Result.ok({ restored: false });
  }

  // Plant the admin's original token back as the session cookie
  await deps.setSessionCookie(backup.value, deps.expiresAt);
  // Delete the backup cookie
  deps.cookies.delete(getAdminSessionCookieName());

  return Result.ok({ restored: true });
}

export async function stopImpersonatingAction(): Promise<StopImpersonatingActionResult> {
  const { cookies } = await import("next/headers");
  const cookieJar = await cookies();
  return performStopImpersonating({
    cookies: {
      get: (name: string) => {
        const c = cookieJar.get(name);
        return c ? { value: c.value } : undefined;
      },
      delete: (name: string) => {
        cookieJar.delete(name);
      },
    },
    setSessionCookie: setAuthCookie,
    clearSessionCookie: clearAuthCookie,
    // We don't know the original expiresAt without re-decoding the JWT.
    // For now, use 7 days from now. (If the admin was already past
    // their session TTL, they'll be re-signed in with a fresh window —
    // which is probably the right UX.)
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
}
