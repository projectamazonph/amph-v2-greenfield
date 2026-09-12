/**
 * GET /api/auth/oauth/[provider] — start an OAuth login (P1-04, PR-D).
 *
 * Third-party login entry point, so an API route is the sanctioned
 * shape (Rule 4). Generates state + PKCE, parks them in short-lived
 * HttpOnly cookies, and redirects to the provider's authorize URL.
 * Unknown or unwired providers fall back to /login with an error
 * code instead of leaking which providers exist.
 */

import { randomBytes, createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { isOAuthProvider } from "@/domain/entities/OAuthAccount";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

export function stateCookieName(provider: string): string {
  return `oauth_${provider}_state`;
}

export function verifierCookieName(provider: string): string {
  return `oauth_${provider}_verifier`;
}

export function codeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const { provider } = await params;
  const container = buildContainer();
  const broker = isOAuthProvider(provider) ? container.oauthBrokers[provider] : undefined;
  if (!broker) {
    return NextResponse.redirect(new URL("/login?error=oauth_unavailable", request.url), {
      status: 303,
    });
  }

  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(64).toString("base64url");
  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, request.url).toString();
  const authorizeUrl = broker.buildAuthorizeUrl({
    state,
    codeChallenge: codeChallenge(verifier),
    redirectUri,
  });

  const response = NextResponse.redirect(authorizeUrl, { status: 303 });
  const cookieBase = {
    httpOnly: true,
    path: "/",
    maxAge: 600,
    sameSite: "lax" as const,
    secure: new URL(request.url).protocol === "https:",
  };
  response.cookies.set(stateCookieName(provider), state, cookieBase);
  response.cookies.set(verifierCookieName(provider), verifier, cookieBase);
  return response;
}
