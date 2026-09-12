/**
 * GoogleOAuthBroker — fetch-based IOAuthBroker for Google (P1-04, PR-D).
 *
 * Hand-rolled OAuth2 with PKCE, no new dependencies. The caller
 * generates state and the PKCE pair; this broker only translates
 * the three protocol steps. Every failure is a typed error —
 * nothing throws across the port boundary.
 */

import { Result } from "@/domain/shared/Result";
import type {
  AuthorizeUrlInput,
  ExchangeCodeInput,
  IOAuthBroker,
  OAuthBrokerError,
  OAuthProfile,
  OAuthTokens,
} from "@/ports/auth/IOAuthBroker";

const AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPES = "openid email profile";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  access_token?: unknown;
  expires_in?: unknown;
  error?: unknown;
  error_description?: unknown;
}

interface UserinfoResponse {
  sub?: unknown;
  email?: unknown;
  email_verified?: unknown;
  name?: unknown;
}

export class GoogleOAuthBroker implements IOAuthBroker {
  readonly provider = "google" as const;

  constructor(private readonly config: GoogleOAuthConfig) {}

  buildAuthorizeUrl(input: AuthorizeUrlInput): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: input.redirectUri,
      response_type: "code",
      scope: SCOPES,
      state: input.state,
      code_challenge: input.codeChallenge,
      code_challenge_method: "S256",
      access_type: "online",
      prompt: "select_account",
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(input: ExchangeCodeInput): Promise<Result<OAuthTokens, OAuthBrokerError>> {
    let response: Response;
    try {
      response = await fetch(TOKEN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: input.code,
          code_verifier: input.codeVerifier,
          grant_type: "authorization_code",
          redirect_uri: input.redirectUri,
        }).toString(),
      });
    } catch (err: unknown) {
      return Result.err({ kind: "network_error", message: String(err) });
    }
    let body: TokenResponse;
    try {
      body = (await response.json()) as TokenResponse;
    } catch (err: unknown) {
      return Result.err({ kind: "invalid_response", message: String(err) });
    }
    if (!response.ok || typeof body.error === "string") {
      const detail =
        typeof body.error_description === "string"
          ? body.error_description
          : typeof body.error === "string"
            ? body.error
            : `HTTP ${response.status}`;
      return Result.err({ kind: "provider_error", message: detail });
    }
    if (typeof body.access_token !== "string" || body.access_token === "") {
      return Result.err({ kind: "invalid_response", message: "missing access_token" });
    }
    const expiresAt =
      typeof body.expires_in === "number" && Number.isFinite(body.expires_in)
        ? new Date(Date.now() + body.expires_in * 1000)
        : null;
    return Result.ok({ accessToken: body.access_token, expiresAt });
  }

  async fetchProfile(accessToken: string): Promise<Result<OAuthProfile, OAuthBrokerError>> {
    let response: Response;
    try {
      response = await fetch(USERINFO_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
    } catch (err: unknown) {
      return Result.err({ kind: "network_error", message: String(err) });
    }
    let body: UserinfoResponse;
    try {
      body = (await response.json()) as UserinfoResponse;
    } catch (err: unknown) {
      return Result.err({ kind: "invalid_response", message: String(err) });
    }
    if (!response.ok) {
      return Result.err({ kind: "provider_error", message: `HTTP ${response.status}` });
    }
    if (typeof body.sub !== "string" || body.sub === "") {
      return Result.err({ kind: "invalid_response", message: "missing sub" });
    }
    if (typeof body.email !== "string" || body.email === "") {
      return Result.err({ kind: "invalid_response", message: "missing email" });
    }
    return Result.ok({
      providerUserId: body.sub,
      email: body.email,
      emailVerified: body.email_verified === true,
      name: typeof body.name === "string" && body.name !== "" ? body.name : null,
    });
  }
}
