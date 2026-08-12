/**
 * /api/auth/logout — STORY-006.
 *
 * Thin shell that orchestrates logout:
 * 1. Extract the session token from the request cookie.
 * 2. Call the Logout use case (deletes the session DB record).
 * 3. Clear the session cookie (next/headers).
 * 4. Redirect to /login.
 *
 * The route accepts POST only. Logout is a state mutation, so it
 * should not be a GET (which is supposed to be safe and idempotent).
 * Allowing GET logout is also a CSRF risk: any third-party site
 * with `<img src="https://amph.example.com/api/auth/logout">` would
 * log the user out. POST + same-origin form action is the standard
 * mitigation.
 *
 * If the token is missing, malformed, or already-expired, the use
 * case returns invalid_token; we still clear the cookie (best-effort
 * — the cookie clear is the part the user cares about) and redirect.
 *
 * Per strict-SOLID:
 * - No business logic in this file. The use case owns the rules.
 * - The cookie-clearing is a framework concern (next/headers) that
 *   the route shell orchestrates.
 */

import { NextResponse } from "next/server";
import { clearAuthCookie, getSessionCookieName } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export function extractSessionToken(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const currentName = getSessionCookieName();
  const alternateName = currentName === "amph_session" ? "__Secure-amph_session" : "amph_session";
  const values = new Map(
    cookieHeader.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      if (separator < 0) return [];
      return [[part.slice(0, separator).trim(), part.slice(separator + 1)]] as const;
    }),
  );
  const rawToken = values.get(currentName) ?? values.get(alternateName);
  if (!rawToken) return "";
  try {
    return decodeURIComponent(rawToken);
  } catch {
    return rawToken;
  }
}

export async function POST(request: Request): Promise<Response> {
  const token = extractSessionToken(request);

  // 1. Call the use case. If the token is invalid (empty, malformed,
  //    already-expired), we treat it as "already logged out" and
  //    continue to clear the cookie + redirect.
  const container = buildContainer();
  await container.logout.execute({ token });

  // 2. Always clear the cookie + redirect. The use case is
  //    idempotent and the cookie clear is the part the user
  //    actually perceives. We must clear on the response we return,
  //    not via cookies() — the same bug as login/signup: NextResponse
  //    doesn't inherit from the implicit cookie store.
  const response = NextResponse.redirect(new URL("/login", request.url), {
    status: 303,
  });
  await clearAuthCookie(response.cookies);

  // 3. Redirect to /login.
  return response;
}
