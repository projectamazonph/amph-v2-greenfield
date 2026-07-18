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
import { clearAuthCookie } from "@/lib/auth";
import { buildContainer } from "@/composition/container";

export function extractSessionToken(request: Request): string {
  const cookieHeader = request.headers.get("cookie") ?? "";
  // The session cookie name is the standard Next.js cookie name set
  // by setAuthCookie() in src/lib/auth.ts.
  const match = cookieHeader.match(/(?:^|;\s*)amph_session=([^;]+)/);
  return match && match[1] ? decodeURIComponent(match[1]) : "";
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
  //    actually perceives.
  await clearAuthCookie();

  // 3. Redirect to /login.
  const url = new URL("/login", request.url);
  return NextResponse.redirect(url, { status: 303 });
}
