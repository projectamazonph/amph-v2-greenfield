/**
 * signup.test.ts — TDD coverage for /api/auth/signup route (STORY-066 follow-up).
 *
 * The route is a thin shell that:
 * 1. Parses formData (email, password, firstName, lastName)
 * 2. Calls performSignUp with the production container
 * 3. Sets the auth cookie on the redirect response
 * 4. Returns 303 to /dashboard
 *
 * The hard part — and the part that has been broken since the STORY-066
 * refactor — is step 3. `setAuthCookie` (via `cookies().set()` from
 * `next/headers`) attaches the cookie to the *implicit* response, but the
 * route returns a fresh `NextResponse.redirect()`. That new response does
 * not inherit the cookies. The user ends up on /dashboard without a
 * session cookie, gets redirected by the proxy to /login, and the E2E
 * "happy path" test in tests/e2e/signup.spec.ts fails with:
 *
 *   Expected pattern: /\/dashboard$/
 *   Received string:  "http://localhost:3000/login?redirect=%2Fdashboard"
 *
 * The fix: set the cookie on the response we return (response.cookies.set),
 * not on the implicit response. This file pins the contract.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Mock next/headers so cookies().set() doesn't blow up in a non-Next context.
// The real behavior we care about is whether the response we return has the
// cookie set, not whether cookies() works in isolation.
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

// Track whether the production container was used (i.e. cookies are wired
// to the real auth helpers) versus a stub. We use this to assert that the
// route actually plumbs the session token onto the outgoing response.
const plantCookieCalls: Array<{ token: string; expiresAt: Date }> = [];
const clearCookieCalls: Array<void> = [];

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    userRepo: { create: vi.fn(async () => ({ ok: true, value: { id: "u-1" } })) },
    idGen: { newId: () => "id-1" },
    clock: { now: () => new Date("2026-01-01T00:00:00.000Z") },
    passwordHasher: { hash: vi.fn(async () => "hashed"), verify: vi.fn(async () => true) },
    login: {
      execute: vi.fn(async () => ({
        ok: true,
        sessionToken: "stubbed-jwt-token",
        userId: "u-1",
        expiresAt: new Date("2026-01-08T00:00:00.000Z"),
      })),
    },
    rateLimiter: {
      check: vi.fn(async () => ({
        ok: true,
        value: { allowed: true, remaining: 9, resetSeconds: 0 },
      })),
    },
    resendVerification: { execute: vi.fn(async () => ({ ok: true, value: undefined })) },
  }),
}));

vi.mock("@/app/actions/signup.action", () => ({
  performSignUp: vi.fn(async (_container, _input, deps) => {
    // Mirror real behavior: plantCookie is invoked with the session token.
    await deps.plantCookie("stubbed-jwt-token", new Date("2026-01-08T00:00:00.000Z"));
    return {
      kind: "success",
      email: "u@example.com",
      sessionToken: "stubbed-jwt-token",
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    };
  }),
}));

import { POST } from "@/app/api/auth/signup/route";

function makeSignupRequest(body: Record<string, string>): Request {
  const form = new URLSearchParams(body);
  return new Request("https://example.com/api/auth/signup", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

beforeEach(() => {
  plantCookieCalls.length = 0;
  clearCookieCalls.length = 0;
});

describe("POST /api/auth/signup — happy path", () => {
  it("returns 303 to /dashboard on success", async () => {
    const request = makeSignupRequest({
      email: "u@example.com",
      password: "Str0ngP@ss123!",
      firstName: "Test",
      lastName: "User",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/dashboard");
  });

  it("sets the amph_session cookie on the redirect response", async () => {
    // The bug we're fixing: cookies set via cookies().set() are LOST when
    // the route returns NextResponse.redirect(). The fix is to set the
    // cookie on the response itself, so it travels with the 303 back to
    // the browser. Without this, the user lands on /dashboard without a
    // session and gets bounced to /login by the proxy.
    const request = makeSignupRequest({
      email: "u@example.com",
      password: "Str0ngP@ss123!",
      firstName: "Test",
      lastName: "User",
    });
    const response = await POST(request);

    // The outgoing response must carry a Set-Cookie header for amph_session
    // (or __Secure-amph_session in production).
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toMatch(/amph_session=/);
    // And the token we set must be the one we got back from login.
    expect(setCookie).toContain("stubbed-jwt-token");
  });

  it("does NOT set the Secure flag and uses the dev cookie name when the request is over HTTP", async () => {
    // Playwright's `next start` (NODE_ENV=production) runs over HTTP
    // localhost — if we set Secure=true or use the `__Secure-` prefix
    // based on NODE_ENV, the browser drops the cookie and the user
    // gets bounced back to /login. The route must decide both from
    // the request protocol, not NODE_ENV.
    const request = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: "u@example.com",
        password: "Str0ngP@ss123!",
        firstName: "Test",
        lastName: "User",
      }).toString(),
    });
    const response = await POST(request);
    const setCookie = response.headers.get("set-cookie") ?? "";
    // Plain dev name (no __Secure- prefix) and no Secure flag.
    expect(setCookie).toMatch(/(?:^|; )amph_session=/);
    expect(setCookie.toLowerCase()).not.toMatch(/(?:^|; )__secure-amph_session=/);
    expect(setCookie.toLowerCase()).not.toMatch(/;\s*secure/);
  });

  it("sets the Secure flag and uses the prod cookie name when the request is over HTTPS", async () => {
    // Real production (Vercel) is always HTTPS, and we want the Secure
    // flag and the `__Secure-` prefix in that case. Make sure we don't
    // accidentally regress and strip them for HTTPS traffic.
    const request = new Request("https://example.com/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email: "u@example.com",
        password: "Str0ngP@ss123!",
        firstName: "Test",
        lastName: "User",
      }).toString(),
    });
    const response = await POST(request);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toMatch(/(?:^|; )__secure-amph_session=/);
    expect(setCookie).toMatch(/;\s*[Ss]ecure/);
  });

  it("returns 303 to /signup?error=email_taken when email is already registered", async () => {
    // Override the mocked performSignUp for this one test.
    const { performSignUp } = await import("@/app/actions/signup.action");
    (performSignUp as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "email_taken",
    });

    const request = makeSignupRequest({
      email: "duplicate@example.com",
      password: "Str0ngP@ss123!",
      firstName: "Test",
      lastName: "User",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/signup?error=email_taken");
  });

  it("does not export a GET handler (CSRF hardening)", async () => {
    const routeModule = await import("@/app/api/auth/signup/route");
    expect((routeModule as { GET?: unknown }).GET).toBeUndefined();
  });
});
