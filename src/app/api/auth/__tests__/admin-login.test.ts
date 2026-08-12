/**
 * admin-login.test.ts — TDD coverage for /api/auth/admin-login route.
 *
 * Pins the same fix as login.test.ts: the session cookie must be planted
 * on the response we actually return, not on the implicit `cookies()`
 * store (which gets discarded when we return a fresh
 * NextResponse.redirect()). This is the bug that was missed when
 * admin-login was added in PR #174 and #192, and that surfaced in
 * production as "admin logs in successfully, lands on /admin, gets
 * bounced straight back to /admin-login by the proxy because no
 * __Secure-amph_session cookie ever reached the browser".
 *
 * Also pins the not_admin branch: a non-admin user who authenticates
 * must NOT receive a session cookie. The cookie should only travel
 * with a 303 to /admin when role === "ADMIN".
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted runs before vi.mock factories — the right place to put
// mutable state that the mocked module's factory closes over.
const mocks = vi.hoisted(() => ({
  performLoginResult: undefined as unknown,
  findByIdResult: undefined as unknown,
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  cookies: () => {
    const store = new Map<string, { name: string; value: string }>();
    return {
      set: (cookie: { name: string; value: string }) => {
        store.set(cookie.name, cookie);
      },
      get: (name: string) => store.get(name),
      delete: (name: string) => {
        store.delete(name);
      },
    };
  },
}));

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    login: {
      execute: vi.fn(async () => ({
        ok: true,
        sessionToken: "stubbed-jwt-token",
        userId: "u-admin-1",
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      })),
    },
    rateLimiter: {
      check: vi.fn(async () => ({
        ok: true,
        value: { allowed: true, remaining: 9, resetSeconds: 0 },
      })),
    },
    userRepo: {
      findById: vi.fn(async () => mocks.findByIdResult),
    },
  }),
}));

vi.mock("@/app/actions/login.action", () => ({
  performLogin: vi.fn(async (_container, _input, deps) => {
    // Honor whatever the per-test mock set up.
    if (mocks.performLoginResult === undefined) {
      await deps.plantCookie("stubbed-jwt-token", new Date("2026-01-08T00:00:00.000Z"));
      return {
        kind: "success",
        redirectTo: "/admin",
        userId: "u-admin-1",
        sessionToken: "stubbed-jwt-token",
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      };
    }
    return mocks.performLoginResult;
  }),
}));

import { POST } from "@/app/api/auth/admin-login/route";

function makeAdminLoginRequest(body: Record<string, string>): Request {
  const form = new URLSearchParams(body);
  return new Request("https://example.com/api/auth/admin-login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

beforeEach(() => {
  mocks.performLoginResult = undefined;
  mocks.findByIdResult = undefined;
});

describe("POST /api/auth/admin-login — happy path (admin role)", () => {
  it("returns 303 to /admin on success for an admin user", async () => {
    mocks.findByIdResult = {
      ok: true,
      value: { id: "u-admin-1", role: "ADMIN" },
    };

    const request = makeAdminLoginRequest({
      email: "admin@example.com",
      password: "Str0ngP@ss123!",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin");
  });

  it("plants the session cookie on the redirect response (HTTPS → __Secure- prefix)", async () => {
    // The bug: performLogin called setAuthCookie via cookies(), which
    // writes to the implicit response. The route then returned a fresh
    // NextResponse.redirect() that did NOT carry that cookie. Browser
    // landed on /admin with no session, proxy bounced to /admin-login.
    // The fix: plant the cookie on response.cookies here so the browser
    // receives it with the 303.
    mocks.findByIdResult = {
      ok: true,
      value: { id: "u-admin-1", role: "ADMIN" },
    };

    const request = makeAdminLoginRequest({
      email: "admin@example.com",
      password: "Str0ngP@ss123!",
    });
    const response = await POST(request);
    const setCookie = response.headers.get("set-cookie") ?? "";
    // HTTPS in production → __Secure- prefix AND Secure flag.
    expect(setCookie.toLowerCase()).toMatch(/__secure-amph_session=/);
    expect(setCookie.toLowerCase()).toContain("secure");
    expect(setCookie).toContain("stubbed-jwt-token");
  });
});

describe("POST /api/auth/admin-login — non-admin user", () => {
  it("redirects to /admin-login?error=not_admin and does NOT plant a cookie", async () => {
    mocks.findByIdResult = {
      ok: true,
      value: { id: "u-student-1", role: "STUDENT" },
    };

    const request = makeAdminLoginRequest({
      email: "student@example.com",
      password: "Str0ngP@ss123!",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin-login?error=not_admin");
    // No cookie should be set on a not_admin bounce — we don't want
    // a half-authenticated state where the user has a session but
    // can't reach /admin.
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("POST /api/auth/admin-login — bad credentials", () => {
  it("returns 303 to /admin-login?error=invalid_credentials on wrong password", async () => {
    mocks.performLoginResult = {
      kind: "redirect_to_login",
      errorKind: "invalid_credentials",
    };

    const request = makeAdminLoginRequest({
      email: "admin@example.com",
      password: "wrong",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/admin-login?error=invalid_credentials");
  });
});
