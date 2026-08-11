/**
 * /api/auth/signup — STORY-066.
 *
 * Plain HTTP POST endpoint for new account registration. Same pattern
 * as /api/auth/login — a Route Handler that returns a 303 redirect
 * instead of a Server Action that calls redirect() (which has a
 * documented pitfall with React 19 useActionState in production).
 *
 * Flow:
 * 1. Parse formData (email, password, firstName, lastName).
 * 2. Call performSignUp() with the production container.
 * 3. On success: Set-Cookie via setAuthCookie + 303 to /dashboard.
 *    (The signup flow auto-logs-in the new user, mirroring the
 *    previous server action's behavior.)
 * 4. On failure: 303 to /signup?error=<kind>.
 */

import { NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { performSignUp } from "@/app/actions/signup.action";

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const email = (form.get("email") as string | null) ?? "";
  const password = (form.get("password") as string | null) ?? "";
  const firstName = (form.get("firstName") as string | null) ?? "";
  const lastName = (form.get("lastName") as string | null) ?? "";
  const rawTier = (form.get("tier") as string | null) ?? "";
  const tier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(rawTier) ? rawTier : null;

  const container = buildContainer();
  const outcome = await performSignUp(
    container,
    { email, password, firstName, lastName },
    {
      plantCookie: setAuthCookie,
      getClientIp: async () => {
        const forwarded = request.headers.get("x-forwarded-for");
        if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
        return request.headers.get("x-real-ip")?.trim() || undefined;
      },
    },
  );

  if (outcome.kind === "success") {
    // Auto-login succeeded — set the session cookie on the response we
    // return, then 303 to /dashboard. The previous flow called
    // setAuthCookie() via cookies() (which writes to the implicit
    // response) and then returned NextResponse.redirect() — the new
    // response did not inherit the cookie, so users landed on
    // /dashboard without a session and got bounced to /login by the
    // proxy. The fix: plant the cookie on response.cookies here, where
    // it travels with the 303 back to the browser.
    //
    // `isHttps` is the single source of truth for both the Secure flag
    // AND the cookie name. Playwright's `next start` (NODE_ENV=
    // production) runs over HTTP localhost, where Secure cookies AND
    // the `__Secure-` prefix are silently dropped. Real production
    // (Vercel) is always HTTPS so both stay on.
    const isHttps = new URL(request.url).protocol === "https:";
    const destination = tier ? `/checkout?pricingTier=${encodeURIComponent(tier)}` : "/dashboard";
    const response = NextResponse.redirect(new URL(destination, request.url), {
      status: 303,
    });
    await setAuthCookie(outcome.sessionToken, outcome.expiresAt, response.cookies, {
      isHttps,
    });
    return response;
  }

  // Map the failure kind to a query-param token. Pages render the
  // user-facing copy, so the route never echoes the server message.
  const errorCode = outcome.kind;

  const retryPath = tier
    ? `/signup?error=${errorCode}&tier=${encodeURIComponent(tier)}`
    : `/signup?error=${errorCode}`;
  const url = new URL(retryPath, request.url);
  return NextResponse.redirect(url, { status: 303 });
}
