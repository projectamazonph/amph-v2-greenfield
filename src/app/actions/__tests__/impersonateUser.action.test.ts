/**
 * impersonateUser.action.test.ts covers `performImpersonateUser`, the
 * pure half of the impersonate server action.
 *
 * The behaviour under test is the cookie choreography, which is where
 * the interesting bug lived: the helper used to look for the admin's
 * original token in the BACKUP cookie, which by definition does not
 * exist on a first impersonation. The admin's token therefore was never
 * saved and "Stop impersonating" could only sign the user out.
 *
 * What we test:
 *  - unauthorized when there is no current admin
 *  - unauthorized when the current user is not an ADMIN
 *  - FIRST impersonation: the session cookie's value is backed up
 *  - a pre-existing backup cookie wins over the current session cookie
 *  - no token to capture at all → no backup cookie is written
 *  - the target user's token is planted as the session cookie
 *  - use-case errors map onto the action's error union, including the
 *    two that carry a message (db_error, token_error)
 */

import { describe, it, expect, vi } from "vitest";
import { Result } from "@/domain/shared/Result";

// Mock server-only so we can import src/lib/auth.ts transitively.
vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: () =>
    Promise.resolve({
      get: vi.fn(),
      set: vi.fn(),
      delete: vi.fn(),
    }),
}));

import { performImpersonateUser, type CurrentAdminUser } from "../impersonateUser.action";
import type { ImpersonateUser } from "@/usecases/ImpersonateUser";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { User } from "@/domain/entities/User";

// In tests NODE_ENV is not "production", so both cookie names are the
// unprefixed variants.
const SESSION_COOKIE = "amph_session";
const ADMIN_BACKUP_COOKIE = "amph_admin_session";
const __SECURE_ADMIN_BACKUP_COOKIE = "__Secure-amph_admin_session";

const EXPIRES_AT = new Date("2026-08-05T00:00:00.000Z");

function makeTargetUser(): User {
  return { id: "user_target", role: "STUDENT" } as unknown as User;
}

/** A cookie jar that records `set` calls, like the real one. */
function makeCookieJar(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));
  const sets: Array<{ name: string; value: string; opts: Record<string, unknown> }> = [];
  return {
    sets,
    get: (name: string) => {
      const value = store.get(name);
      return value === undefined ? undefined : { value };
    },
    set: (
      cookie: {
        name: string;
        value: string;
        httpOnly?: boolean;
        secure?: boolean;
        sameSite?: "lax" | "strict" | "none";
        path?: string;
        expires?: Date;
        maxAge?: number;
      },
    ) => {
      store.set(cookie.name, cookie.value);
      sets.push({
        name: cookie.name,
        value: cookie.value,
        opts: {
          httpOnly: cookie.httpOnly,
          secure: cookie.secure,
          sameSite: cookie.sameSite,
          path: cookie.path,
          maxAge: cookie.maxAge,
        },
      });
    },
  };
}

function makeContainer(options: {
  cookies: ReturnType<typeof makeCookieJar>;
  execute?: ImpersonateUser["execute"];
  isHttps?: boolean;
}) {
  const setSessionCookie = vi.fn(async () => {});
  const setAdminSessionCookie = vi.fn(async () => ADMIN_BACKUP_COOKIE);
  const execute =
    options.execute ??
    (vi.fn(async () =>
      Result.ok({
        token: "target-token",
        expiresAt: EXPIRES_AT,
        targetUser: makeTargetUser(),
      }),
    ) as unknown as ImpersonateUser["execute"]);

  return {
    container: {
      userRepo: {} as UserRepository,
      impersonateUser: { execute } as unknown as ImpersonateUser,
      setSessionCookie: setSessionCookie as unknown as typeof import("@/lib/auth").setAuthCookie,
      setAdminSessionCookie: setAdminSessionCookie as unknown as typeof import("@/lib/auth").setAdminSessionCookie,
      cookies: options.cookies,
      isHttps: options.isHttps ?? false,
    },
    setSessionCookie,
    setAdminSessionCookie,
    execute,
  };
}

function getCurrentAdmin(admin: CurrentAdminUser | null) {
  return async () => admin;
}

const ADMIN: CurrentAdminUser = { id: "user_admin", role: "ADMIN" };

describe("performImpersonateUser", () => {
  it("returns unauthorized when there is no current user", async () => {
    const { container } = makeContainer({ cookies: makeCookieJar() });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(null),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unauthorized");
  });

  it("returns unauthorized when the current user is not an ADMIN", async () => {
    const { container } = makeContainer({ cookies: makeCookieJar() });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin({ id: "user_student", role: "STUDENT" } as unknown as CurrentAdminUser),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("unauthorized");
  });

  it("backs up the session cookie on a FIRST impersonation", async () => {
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const { container, setAdminSessionCookie } = makeContainer({ cookies });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(result.ok).toBe(true);
    // S3: the helper now owns the backup write, with name + Secure
    // flag derived from the same `isHttps` signal.
    expect(setAdminSessionCookie).toHaveBeenCalledWith(
      "admin-token",
      expect.objectContaining({ set: expect.any(Function) }),
      { isHttps: false },
    );
    // Cookie jar's manual set should NOT have been called — all cookie
    // writes go through the helper now.
    const backup = cookies.sets.find((c) => c.name === ADMIN_BACKUP_COOKIE);
    expect(backup).toBeUndefined();
  });

  it("keeps an existing backup cookie instead of the current session cookie", async () => {
    const cookies = makeCookieJar({
      [SESSION_COOKIE]: "impersonated-token",
      [ADMIN_BACKUP_COOKIE]: "admin-token",
    });
    const { container, setAdminSessionCookie } = makeContainer({ cookies });

    await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(setAdminSessionCookie).toHaveBeenCalledWith(
      "admin-token", // not "impersonated-token"
      expect.objectContaining({ set: expect.any(Function) }),
      { isHttps: false },
    );
  });

  it("writes no backup cookie when there is no token to capture", async () => {
    const cookies = makeCookieJar();
    const { container, setAdminSessionCookie } = makeContainer({ cookies });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(result.ok).toBe(true);
    expect(setAdminSessionCookie).not.toHaveBeenCalled();
  });

  it("plants the target user's token as the session cookie", async () => {
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const { container, setSessionCookie, execute } = makeContainer({ cookies });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(execute).toHaveBeenCalledWith({
      targetUserId: "user_target",
      adminUserId: "user_admin",
    });
    expect(setSessionCookie).toHaveBeenCalledWith("target-token", EXPIRES_AT);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toEqual({ targetUserId: "user_target", expiresAt: EXPIRES_AT });
    }
  });

  it("S3: when isHttps=true, the helper receives isHttps=true so name+secure stay in lock-step", async () => {
    // The actual cookie-name + Secure-flag pairing is enforced inside
    // `setAdminSessionCookie` (covered by the unit tests next to that
    // helper). What this test verifies is that the action passes the
    // runtime-derived `isHttps` through to the helper instead of
    // recomputing it from NODE_ENV.
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const { container, setAdminSessionCookie } = makeContainer({
      cookies,
      isHttps: true,
    });

    await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(setAdminSessionCookie).toHaveBeenCalledWith(
      "admin-token",
      expect.anything(),
      { isHttps: true },
    );
  });

  it.each([
    ["target_user_not_found", "target_user_not_found"],
    ["cannot_impersonate_admin", "cannot_impersonate_admin"],
    ["cannot_impersonate_self", "cannot_impersonate_self"],
    ["admin_user_not_found", "unauthorized"],
  ] as const)("maps use-case error %s to %s", async (useCaseKind, actionKind) => {
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const execute = vi.fn(async () =>
      Result.err({ kind: useCaseKind }),
    ) as unknown as ImpersonateUser["execute"];
    const { container, setAdminSessionCookie, setSessionCookie } = makeContainer({
      cookies,
      execute,
    });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe(actionKind);
    // A failed impersonation must not touch either cookie.
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(setAdminSessionCookie).not.toHaveBeenCalled();
    expect(cookies.sets).toHaveLength(0);
  });

  it("maps a use-case token_error, preserving its message", async () => {
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const execute = vi.fn(async () =>
      Result.err({ kind: "token_error", message: "jwt sign failed" }),
    ) as unknown as ImpersonateUser["execute"];
    const { container, setSessionCookie, setAdminSessionCookie } = makeContainer({
      cookies,
      execute,
    });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual({ kind: "token_error", message: "jwt sign failed" });
    }
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(setAdminSessionCookie).not.toHaveBeenCalled();
    expect(cookies.sets).toHaveLength(0);
  });

  it("does not back up the admin token when the use case fails", async () => {
    const cookies = makeCookieJar({ [SESSION_COOKIE]: "admin-token" });
    const execute = vi.fn(async () =>
      Result.err({ kind: "db_error", message: "boom" }),
    ) as unknown as ImpersonateUser["execute"];
    const { container, setSessionCookie, setAdminSessionCookie } = makeContainer({
      cookies,
      execute,
    });

    const result = await performImpersonateUser(
      container,
      { targetUserId: "user_target" },
      getCurrentAdmin(ADMIN),
    );

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toEqual({ kind: "db_error", message: "boom" });
    expect(setSessionCookie).not.toHaveBeenCalled();
    expect(setAdminSessionCookie).not.toHaveBeenCalled();
    expect(cookies.sets).toHaveLength(0);
  });
});

// ── S3 regression: cookie name + Secure flag must agree ────────────────────
// The unit test for `setAdminSessionCookie` lives next to that helper so
// the test runner discovers it via the same Vitest config. This block
// imports the helper directly and asserts the lock-step property that
// makes S3 reproducible.
describe("setAdminSessionCookie (S3 lock-step)", () => {
  it("writes the unprefixed admin cookie name with Secure=false when isHttps=false", async () => {
    const { setAdminSessionCookie } = await import("@/lib/auth");
    const sets: Array<{
      name: string;
      value: string;
      secure?: boolean;
      httpOnly?: boolean;
      sameSite?: string;
      path?: string;
      maxAge?: number;
    }> = [];
    await setAdminSessionCookie(
      "token",
      {
        set: (cookie) => {
          sets.push(cookie);
        },
      },
      { isHttps: false },
    );
    expect(sets).toEqual([
      expect.objectContaining({
        name: ADMIN_BACKUP_COOKIE,
        value: "token",
        secure: false,
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 24 * 60 * 60,
      }),
    ]);
  });

  it("writes the __Secure- prefixed admin cookie name with Secure=true when isHttps=true", async () => {
    const { setAdminSessionCookie } = await import("@/lib/auth");
    const sets: Array<{
      name: string;
      value: string;
      secure?: boolean;
    }> = [];
    await setAdminSessionCookie(
      "token",
      {
        set: (cookie) => {
          sets.push(cookie);
        },
      },
      { isHttps: true },
    );
    expect(sets).toEqual([
      expect.objectContaining({
        name: __SECURE_ADMIN_BACKUP_COOKIE,
        value: "token",
        secure: true,
      }),
    ]);
  });

  it("S3 invariant: lock-step across both isHttps branches (secure-prefix ↔ Secure=true)", async () => {
    const { setAdminSessionCookie } = await import("@/lib/auth");
    // True single-source-of-truth: the helper derives both the cookie
    // name and the Secure flag from `isHttps`. There is NO `secure`
    // override because allowing one is exactly the drift the S3 audit
    // flagged. Sweep both branches and assert the invariant directly.
    for (const isHttps of [true, false] as const) {
      const sets: Array<{ name: string; secure?: boolean }> = [];
      await setAdminSessionCookie(
        "token",
        { set: (cookie) => sets.push(cookie) },
        { isHttps },
      );
      const cookie = sets[0];
      expect(cookie).toBeDefined();
      const expectedName = isHttps ? __SECURE_ADMIN_BACKUP_COOKIE : ADMIN_BACKUP_COOKIE;
      expect(cookie?.name).toBe(expectedName);
      expect(cookie?.secure).toBe(isHttps);
      // Invariant: __Secure- prefix ↔ Secure=true, no drift.
      expect(cookie?.name.startsWith("__Secure-")).toBe(cookie?.secure === true);
    }
  });
});
