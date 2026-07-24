/**
 * /api/auth/login — STORY-066.
 *
 * Plain HTTP POST endpoint for authentication. The most widely deployed
 * auth pattern on the web: form POST → 303 redirect with Set-Cookie.
 *
 * Why an API route instead of a Server Action:
 * - Server Actions in Next.js 16 + React 19 have fragile interaction
 *   between `useActionState` and `redirect()` — `redirect()` throws a
 *   NEXT_REDIRECT error that gets swallowed when wrapped in try/catch
 *   or when the action is invoked from certain contexts. That produced
 *   a 500 "Server Components render" with a hashed digest in production.
 * - Plain Route Handlers use standard HTTP semantics: Set-Cookie header
 *   + 303 See Other. No `useActionState`, no `useRouter`, no `useEffect`,
 *   no NEXT_REDIRECT magic. The browser handles the redirect natively.
 *
 * Mirrors the existing logout route at /api/auth/logout/route.ts.
 *
 * Flow:
 * 1. Parse formData (email, password, redirectTo).
 * 2. Call performLogin() with the production container.
 * 3. On success: Set-Cookie via setAuthCookie + 303 to redirectTo.
 * 4. On failure: 303 to /login?error=<kind> (no body, no Set-Cookie).
 *
 * Rate limiting is delegated to performLogin() (which uses
 * container.rateLimiter — UpstashRateLimiter in production).
 */

import { NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { performLogin } from "@/app/actions/login.action";

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const email = (form.get("email") as string | null) ?? "";
  const password = (form.get("password") as string | null) ?? "";
  const redirectTo = (form.get("redirectTo") as string | null) ?? "/courses";

  const container = buildContainer();
  const outcome = await performLogin(
    container,
    { email, password, redirectTo },
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
    // Set-Cookie was set by plantCookie (setAuthCookie) on the response
    // cookies. Send a 303 to the safe redirect target.
    const url = new URL(outcome.redirectTo, request.url);
    return NextResponse.redirect(url, { status: 303 });
  }

  // Map the failure kind to a query-param token that the /login page
  // reads via searchParams and renders as an alert. We don't echo the
  // server-side error message to the client — the page owns the copy.
  const errorCode =
    outcome.kind === "invalid_input"
      ? "invalid_input"
      : outcome.kind === "rate_limited"
        ? "rate_limited"
        : outcome.kind === "redirect_to_login"
          ? outcome.errorKind
          : "unexpected";

  const url = new URL(`/login?error=${errorCode}`, request.url);
  return NextResponse.redirect(url, { status: 303 });
}
