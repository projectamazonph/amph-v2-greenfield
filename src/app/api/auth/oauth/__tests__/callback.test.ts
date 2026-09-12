/**
 * OAuth callback-route tests (P1-04).
 *
 * Pins: state mismatch and provider denial fail closed to /login,
 * and the happy path plants the session cookie on the 303 to
 * /dashboard while clearing the OAuth cookies.
 */

import { describe, expect, it, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { StubOAuthBroker } from "@/infra/auth/StubOAuthBroker";

vi.mock("server-only", () => ({}));

const { loginExecute } = vi.hoisted(() => ({ loginExecute: vi.fn() }));

const broker = new StubOAuthBroker("google");

vi.mock("@/composition/container", () => ({
  buildContainer: () => ({
    oauthBrokers: { google: broker },
    loginWithOAuth: { execute: loginExecute },
  }),
}));

import { GET } from "@/app/api/auth/oauth/[provider]/callback/route";

const CALLBACK = "http://localhost/api/auth/oauth/google/callback";

function get(query: string, cookies = ""): Request {
  return new Request(`${CALLBACK}?${query}`, {
    method: "GET",
    headers: cookies ? { cookie: cookies } : {},
  });
}

function cookiePair() {
  return "oauth_google_state=state-1; oauth_google_verifier=verifier-1";
}

beforeEach(() => {
  broker.exchangeQueue = [];
  broker.profileQueue = [];
  broker.exchanged.length = 0;
  loginExecute.mockReset();
});

describe("GET /api/auth/oauth/[provider]/callback", () => {
  it("fails closed on a state mismatch", async () => {
    const response = await GET(get("code=c&state=wrong", cookiePair()), {
      params: Promise.resolve({ provider: "google" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=oauth_state");
    expect(broker.exchanged).toHaveLength(0);
  });

  it("fails closed when the provider reports denial", async () => {
    const response = await GET(get("error=access_denied", cookiePair()), {
      params: Promise.resolve({ provider: "google" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=oauth_denied");
  });

  it("signs in, plants the session cookie, and clears OAuth cookies", async () => {
    broker.exchangeQueue.push(Result.ok({ accessToken: "tok", expiresAt: null }));
    broker.profileQueue.push(
      Result.ok({
        providerUserId: "google-1",
        email: "student@example.com",
        emailVerified: true,
        name: "Student One",
      }),
    );
    loginExecute.mockResolvedValue(
      Result.ok({
        sessionToken: "session-jwt",
        userId: "user-1",
        expiresAt: new Date("2026-09-18T00:00:00Z"),
        isNewUser: false,
      }),
    );

    const response = await GET(get("code=c&state=state-1", cookiePair()), {
      params: Promise.resolve({ provider: "google" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/dashboard");
    expect(loginExecute).toHaveBeenCalledWith({
      profile: {
        provider: "google",
        providerUserId: "google-1",
        email: "student@example.com",
        emailVerified: true,
        name: "Student One",
        accessToken: "tok",
        expiresAt: null,
      },
    });
    const setCookies = response.headers.getSetCookie().join("; ");
    expect(setCookies).toContain("session-jwt");
    expect(setCookies).toContain("oauth_google_state=;");
    expect(setCookies).toContain("oauth_google_verifier=;");
  });

  it("maps a 2FA refusal to a login error code", async () => {
    broker.exchangeQueue.push(Result.ok({ accessToken: "tok", expiresAt: null }));
    broker.profileQueue.push(
      Result.ok({
        providerUserId: "google-1",
        email: "secure@example.com",
        emailVerified: true,
        name: "Secure User",
      }),
    );
    loginExecute.mockResolvedValue(Result.err({ kind: "two_factor_required" }));

    const response = await GET(get("code=c&state=state-1", cookiePair()), {
      params: Promise.resolve({ provider: "google" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=oauth_2fa_required");
  });
});
