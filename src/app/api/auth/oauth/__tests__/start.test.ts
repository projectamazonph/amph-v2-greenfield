/**
 * OAuth start-route tests (P1-04).
 *
 * Pins: unknown providers fall back to /login, and a wired broker
 * produces a 303 to its authorize URL with state + verifier parked
 * in HttpOnly cookies.
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

import { GET } from "@/app/api/auth/oauth/[provider]/route";

beforeEach(() => {
  broker.authorizeUrls.length = 0;
  loginExecute.mockReset();
});

function get(url: string): Request {
  return new Request(url, { method: "GET" });
}

describe("GET /api/auth/oauth/[provider]", () => {
  it("redirects unknown providers to /login without leaking configuration", async () => {
    const response = await GET(get("http://localhost/api/auth/oauth/twitter"), {
      params: Promise.resolve({ provider: "twitter" }),
    });

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("/login?error=oauth_unavailable");
    expect(broker.authorizeUrls).toHaveLength(0);
  });

  it("parks state and verifier cookies and redirects to the broker", async () => {
    const response = await GET(get("http://localhost/api/auth/oauth/google"), {
      params: Promise.resolve({ provider: "google" }),
    });

    expect(response.status).toBe(303);
    const location = response.headers.get("location") ?? "";
    expect(location).toContain("stub-oauth.example/authorize");
    const stateMatch = /state=([^&]+)/.exec(location);
    expect(stateMatch?.[1]).toBeTruthy();
    const setCookies = response.headers.getSetCookie();
    expect(setCookies.some((c) => c.startsWith("oauth_google_state="))).toBe(true);
    expect(setCookies.some((c) => c.startsWith("oauth_google_verifier="))).toBe(true);
    expect(
      setCookies
        .find((c) => c.startsWith("oauth_google_state="))
        ?.includes(encodeURIComponent(stateMatch?.[1] ?? "missing")),
    ).toBe(true);
  });
});
