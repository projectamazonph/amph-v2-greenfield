/**
 * GET /api/auth/oauth/[provider]/callback — finish an OAuth login (P1-04, PR-D).
 *
 * Verifies state against the start-route cookie, exchanges the code
 * through the broker, signs the user in via LoginWithOAuth, and
 * plants the session cookie on the 303 to /dashboard (same pattern
 * as the signup route — implicit-store cookies would be lost on the
 * fresh redirect response). Every failure redirects to /login with
 * an error code; pages render the user-facing copy.
 */

import { NextResponse } from "next/server";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { isOAuthProvider } from "@/domain/entities/OAuthAccount";
import { stateCookieName, verifierCookieName } from "../route";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ provider: string }>;
}

function fail(request: Request, code: string): Response {
  return NextResponse.redirect(new URL(`/login?error=${code}`, request.url), {
    status: 303,
  });
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

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");
  if (providerError || !code || !state) {
    return fail(request, "oauth_denied");
  }

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((part) => {
      const index = part.indexOf("=");
      return index === -1
        ? [part.trim(), ""]
        : [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
    }),
  );
  const expectedState = cookies[stateCookieName(provider)];
  const verifier = cookies[verifierCookieName(provider)];
  if (!expectedState || !verifier || expectedState !== state) {
    return fail(request, "oauth_state");
  }

  const redirectUri = new URL(`/api/auth/oauth/${provider}/callback`, request.url).toString();
  const exchanged = await broker.exchangeCode({ code, codeVerifier: verifier, redirectUri });
  if (!exchanged.ok) {
    return fail(request, "oauth_exchange");
  }
  const profiled = await broker.fetchProfile(exchanged.value.accessToken);
  if (!profiled.ok) {
    return fail(request, "oauth_profile");
  }

  const login = await container.loginWithOAuth.execute({
    profile: {
      provider: broker.provider,
      providerUserId: profiled.value.providerUserId,
      email: profiled.value.email,
      emailVerified: profiled.value.emailVerified,
      name: profiled.value.name,
      accessToken: exchanged.value.accessToken,
      expiresAt: exchanged.value.expiresAt,
    },
  });
  const clearState = (response: NextResponse): NextResponse => {
    response.cookies.delete(stateCookieName(provider));
    response.cookies.delete(verifierCookieName(provider));
    return response;
  };
  if (!login.ok) {
    const code =
      login.error.kind === "two_factor_required"
        ? "oauth_2fa_required"
        : login.error.kind === "unverified_email"
          ? "oauth_unverified"
          : login.error.kind === "account_suspended" || login.error.kind === "account_locked"
            ? "oauth_blocked"
            : "oauth_failed";
    return clearState(
      NextResponse.redirect(new URL(`/login?error=${code}`, request.url), { status: 303 }),
    );
  }

  const isHttps = new URL(request.url).protocol === "https:";
  const response = clearState(
    NextResponse.redirect(new URL("/dashboard", request.url), { status: 303 }),
  );
  await setAuthCookie(login.value.sessionToken, login.value.expiresAt, response.cookies, {
    isHttps,
  });
  return response;
}
