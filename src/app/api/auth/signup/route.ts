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
    // Auto-login succeeded — redirect to dashboard.
    const url = new URL("/dashboard", request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Map the failure kind to a query-param token. Pages render the
  // user-facing copy, so the route never echoes the server message.
  const errorCode = outcome.kind;

  const url = new URL(`/signup?error=${errorCode}`, request.url);
  return NextResponse.redirect(url, { status: 303 });
}
