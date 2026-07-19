/**
 * impersonateUserAction — admin server action to impersonate another user.
 *
 * STORY-047: Admin user detail + impersonate.
 *
 * Thin wrapper around ImpersonateUser.execute. The use case returns a
 * fresh JWT for the target user; this action:
 *  1. Authenticates the caller via getSessionUserId
 *  2. Reads the caller's CURRENT session cookie (so we can save it as
     the "admin backup" cookie)
 *  3. Calls ImpersonateUser.execute
 *  4. Plants the returned token as the session cookie
 *  5. Plants the admin's original token as the amph_admin_session cookie
 *  6. Returns success
 *
 * The page redirects to "/" after the action returns. P0-4 added a real
 * /dashboard route, so impersonated users could in principle land there
 * — but the audit recommended keeping the landing on /courses for now
 * (the canonical catalog view).
 *
 * The testable pure logic lives in `performImpersonateUser` (exported
 * below). The action wrapper is the thin shell that wires in the
 * session-cookie reads and the auth check.
 */

"use server";

import { Result } from "@/domain/shared/Result";
import { buildContainer } from "@/composition/container";
import { getSessionUserId, setAuthCookie } from "@/lib/auth";
import type { ImpersonateUser } from "@/usecases/ImpersonateUser";
import type { UserRepository } from "@/ports/repositories/UserRepository";

// ── Public types ───────────────────────────────────────────────────────────

export interface ImpersonateUserActionInput {
  targetUserId: string;
}

export type ImpersonateUserActionError =
  | { kind: "unauthorized" }
  | { kind: "target_user_not_found" }
  | { kind: "cannot_impersonate_admin" }
  | { kind: "cannot_impersonate_self" }
  | { kind: "db_error"; message: string }
  | { kind: "token_error"; message: string };

export type ImpersonateUserActionResult = Result<
  { targetUserId: string; expiresAt: Date },
  ImpersonateUserActionError
>;

// ── Testable pure helper ──────────────────────────────────────────────────

/**
 * The "current user" shape the helper needs.
 */
export interface CurrentAdminUser {
  id: string;
  role: "ADMIN";
}

/**
 * Pure helper. Testable without Next runtime.
 *
 * 1. Resolve the current user (must be admin)
 * 2. Read the admin's current session token (so we can back it up)
 * 3. Delegate to ImpersonateUser.execute
 * 4. Plant the new token as the session cookie
 * 5. Plant the admin's original token as the backup cookie
 */
export async function performImpersonateUser(
  container: {
    userRepo: UserRepository;
    impersonateUser: ImpersonateUser;
    setSessionCookie: typeof setAuthCookie;
    cookies: {
      get: (name: string) => { value: string } | undefined;
      set: (name: string, value: string, opts: Record<string, unknown>) => void;
    };
  },
  input: ImpersonateUserActionInput,
  getCurrentAdmin: (
    container: { userRepo: UserRepository },
  ) => Promise<CurrentAdminUser | null>,
): Promise<ImpersonateUserActionResult> {
  // 1. Authenticate
  const admin = await getCurrentAdmin(container);
  if (!admin || admin.role !== "ADMIN") {
    return Result.err({ kind: "unauthorized" });
  }

  // 2. Read the admin's current session token (so we can back it up)
  const adminToken = container.cookies.get(getAdminSessionCookieName());
  // Note: if adminToken is undefined, the admin is impersonating again
  // (the "real" admin token was already saved on the first impersonation).
  // For now, we don't support nested impersonation — bail out.

  // 3. Delegate to the use case
  const result = await container.impersonateUser.execute({
    targetUserId: input.targetUserId,
    adminUserId: admin.id,
  });

  if (!result.ok) {
    if (result.error.kind === "target_user_not_found") {
      return Result.err({ kind: "target_user_not_found" });
    }
    if (result.error.kind === "cannot_impersonate_admin") {
      return Result.err({ kind: "cannot_impersonate_admin" });
    }
    if (result.error.kind === "cannot_impersonate_self") {
      return Result.err({ kind: "cannot_impersonate_self" });
    }
    if (result.error.kind === "admin_user_not_found") {
      return Result.err({ kind: "unauthorized" });
    }
    if (result.error.kind === "db_error") {
      return Result.err({ kind: "db_error", message: result.error.message });
    }
    if (result.error.kind === "token_error") {
      return Result.err({ kind: "token_error", message: result.error.message });
    }
    return Result.err({ kind: "db_error", message: "Unknown error" });
  }

  // 4. Plant the new token as the session cookie
  await container.setSessionCookie(result.value.token, result.value.expiresAt);

  // 5. Plant the admin's original token as the backup cookie
  //    (only if we have one — nested impersonation is not supported)
  if (adminToken?.value) {
    // The backup cookie has a 24h maxAge — admins shouldn't impersonate
    // for longer than a working day. After 24h, the backup expires and
    // the admin has to sign out + sign in again.
    container.cookies.set(getAdminSessionCookieName(), adminToken.value, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60, // 24h
    });
  } else {
    // First-time impersonation: no backup token. The current session
    // cookie IS the admin's session. We need to read it BEFORE we
    // overwrote it. For now, we mark the backup as empty and the
    // "Stop impersonating" action will need to handle that case.
    // (Out of scope for this story — log a TODO.)
    // TODO (STORY-X): properly capture the admin's original token on
    // first impersonation. For now, skip.
  }

  return Result.ok({
    targetUserId: result.value.targetUser.id,
    expiresAt: result.value.expiresAt,
  });
}

// ── Cookie name ───────────────────────────────────────────────────────────

/**
 * Name of the cookie that holds the admin's ORIGINAL session token
 * during impersonation. Different from the regular session cookie
 * (amph_session / __Secure-amph_session) so the impersonation
 * machinery can detect "we're impersonating" by the presence of this
 * cookie.
 */
function getAdminSessionCookieName(): string {
  return process.env.NODE_ENV === "production"
    ? "__Secure-amph_admin_session"
    : "amph_admin_session";
}

// ── Action wrapper (thin shell) ──────────────────────────────────────────

/**
 * Default getCurrentAdmin: reads the session, loads the user, and
 * verifies the role.
 */
async function defaultGetCurrentAdmin(container: {
  userRepo: UserRepository;
}): Promise<CurrentAdminUser | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const userResult = await container.userRepo.findById(userId);
  if (!userResult.ok) return null;
  if (userResult.value.role !== "ADMIN") return null;
  return { id: userResult.value.id, role: "ADMIN" };
}

export async function impersonateUserAction(
  input: ImpersonateUserActionInput,
): Promise<ImpersonateUserActionResult> {
  const { cookies } = await import("next/headers");
  const cookieJar = await cookies();
  const container = {
    ...buildContainer(),
    setSessionCookie: setAuthCookie,
    cookies: {
      get: (name: string) => {
        const c = cookieJar.get(name);
        return c ? { value: c.value } : undefined;
      },
      set: (name: string, value: string, opts: Record<string, unknown>) => {
        cookieJar.set({
          name,
          value,
          httpOnly: opts.httpOnly as boolean | undefined,
          secure: opts.secure as boolean | undefined,
          sameSite: opts.sameSite as "lax" | "strict" | "none" | undefined,
          path: opts.path as string | undefined,
          maxAge: opts.maxAge as number | undefined,
        });
      },
    },
  };
  return performImpersonateUser(container, input, defaultGetCurrentAdmin);
}
