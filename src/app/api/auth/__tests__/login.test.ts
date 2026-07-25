/**
 * login.test.ts — TDD coverage for /api/auth/login route (STORY-066 follow-up).
 *
 * Same root cause as signup: `setAuthCookie` (via `cookies().set()` from
 * `next/headers`) attaches the cookie to the *implicit* response, but
 * the route returns a fresh `NextResponse.redirect()`. The cookies are
 * lost. After a successful login the user lands on /courses without a
 * session cookie and is bounced back to /login.
 *
 * The fix mirrors the signup route: set the cookie on the response we
 * actually return.
 */

import { describe, it, expect, vi } from "vitest";

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
  }),
}));

vi.mock("@/app/actions/login.action", () => ({
  performLogin: vi.fn(async (_container, _input, deps) => {
    await deps.plantCookie("stubbed-jwt-token", new Date("2026-01-08T00:00:00.000Z"));
    return {
      kind: "success",
      redirectTo: "/courses",
      userId: "u-1",
      sessionToken: "stubbed-jwt-token",
      expiresAt: new Date("2026-01-08T00:00:00.000Z"),
    };
  }),
}));

import { POST } from "@/app/api/auth/login/route";

function makeLoginRequest(body: Record<string, string>): Request {
  const form = new URLSearchParams(body);
  return new Request("https://example.com/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: form.toString(),
  });
}

describe("POST /api/auth/login — happy path", () => {
  it("returns 303 to the safe redirectTo on success", async () => {
    const request = makeLoginRequest({
      email: "u@example.com",
      password: "Str0ngP@ss123!",
      redirectTo: "/courses",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/courses");
  });

  it("sets the amph_session cookie on the redirect response", async () => {
    // The bug: cookies().set() inside the route get lost because the
    // route returns NextResponse.redirect(). The fix sets the cookie
    // on the response we return so the browser receives it.
    const request = makeLoginRequest({
      email: "u@example.com",
      password: "Str0ngP@ss123!",
      redirectTo: "/courses",
    });
    const response = await POST(request);
    const setCookie = response.headers.get("set-cookie") ?? "";
    expect(setCookie.toLowerCase()).toMatch(/amph_session=/);
    expect(setCookie).toContain("stubbed-jwt-token");
  });

  it("returns 303 to /login?error=wrong_password on bad credentials", async () => {
    const { performLogin } = await import("@/app/actions/login.action");
    (performLogin as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      kind: "redirect_to_login",
      errorKind: "wrong_password",
    });

    const request = makeLoginRequest({
      email: "u@example.com",
      password: "wrong",
      redirectTo: "/courses",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=wrong_password");
  });

  it("rejects open redirects to absolute URLs", async () => {
    // /login uses a safeRedirect fallback. Even if the client lies about
    // redirectTo, we must not redirect off-site. The route's redirect
    // target is determined by performLogin, which applies the safeRedirect
    // rule. This test just pins the contract: a malicious redirectTo
    // results in a redirect somewhere safe (here, /courses).
    const request = makeLoginRequest({
      email: "u@example.com",
      password: "Str0ngP@ss123!",
      redirectTo: "https://evil.example.com",
    });
    const response = await POST(request);
    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).not.toContain("evil.example.com");
  });

  it("does not export a GET handler (CSRF hardening)", async () => {
    const routeModule = await import("@/app/api/auth/login/route");
    expect((routeModule as { GET?: unknown }).GET).toBeUndefined();
  });
});
