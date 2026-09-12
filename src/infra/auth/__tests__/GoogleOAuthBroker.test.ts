/**
 * GoogleOAuthBroker tests (P1-04).
 *
 * Pins: authorize URL parameters, token exchange mapping, profile
 * mapping, and typed failures. fetch is mocked; no HTTP happens.
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { GoogleOAuthBroker } from "@/infra/auth/GoogleOAuthBroker";

const CONFIG = { clientId: "test-client-id", clientSecret: "test-secret" };

describe("GoogleOAuthBroker", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it("builds an authorize URL with PKCE and state", () => {
    const broker = new GoogleOAuthBroker(CONFIG);

    const url = new URL(
      broker.buildAuthorizeUrl({
        state: "state-123",
        codeChallenge: "challenge-abc",
        redirectUri: "https://app.example/api/auth/oauth/google/callback",
      }),
    );

    expect(url.origin + url.pathname).toBe("https://accounts.google.com/o/oauth2/v2/auth");
    expect(url.searchParams.get("client_id")).toBe("test-client-id");
    expect(url.searchParams.get("state")).toBe("state-123");
    expect(url.searchParams.get("code_challenge")).toBe("challenge-abc");
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("scope")).toContain("openid");
  });

  it("exchanges a code for tokens with expiry", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ access_token: "tok", expires_in: 3600 }),
    } as Response);
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.exchangeCode({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: "https://app.example/callback",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.accessToken).toBe("tok");
      expect(result.value.expiresAt).toBeInstanceOf(Date);
    }
    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit];
    expect(String(init.body)).toContain("code_verifier=verifier-1");
  });

  it("maps a provider rejection to provider_error", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "invalid_grant", error_description: "Bad code." }),
    } as Response);
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.exchangeCode({
      code: "bad",
      codeVerifier: "verifier-1",
      redirectUri: "https://app.example/callback",
    });

    expect(result).toEqual(Result.err({ kind: "provider_error", message: "Bad code." }));
  });

  it("maps a fetch throw to network_error", async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error("down"));
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.exchangeCode({
      code: "code-1",
      codeVerifier: "verifier-1",
      redirectUri: "https://app.example/callback",
    });

    expect(Result.isErr(result)).toBe(true);
    if (Result.isErr(result)) {
      expect(result.error.kind).toBe("network_error");
    }
  });

  it("fetches and narrows the profile", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          sub: "google-1",
          email: "Student@Example.com",
          email_verified: true,
          name: "Student One",
        }),
    } as Response);
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.fetchProfile("tok");

    expect(result).toEqual(
      Result.ok({
        providerUserId: "google-1",
        email: "Student@Example.com",
        emailVerified: true,
        name: "Student One",
      }),
    );
  });

  it("treats a missing email_verified claim as unverified", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ sub: "google-1", email: "a@x", name: null }),
    } as Response);
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.fetchProfile("tok");

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.emailVerified).toBe(false);
      expect(result.value.name).toBeNull();
    }
  });

  it("rejects a profile without sub or email", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ sub: "", email: "" }),
    } as Response);
    const broker = new GoogleOAuthBroker(CONFIG);

    const result = await broker.fetchProfile("tok");

    expect(Result.isErr(result)).toBe(true);
  });
});
