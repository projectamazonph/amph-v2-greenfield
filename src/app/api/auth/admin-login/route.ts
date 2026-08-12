/**
 * /api/auth/admin-login — admin-specific authentication.
 *
 * Same auth flow as /api/auth/login, but:
 * 1. On success, always redirects to /admin (not /courses).
 * 2. Verifies the user's role is ADMIN; redirects to /admin-login?error=not_admin
 *    if they log in with a non-admin account.
 *
 * The /admin-login page is publicly accessible (outside the /admin/* proxy
 * protection). The regular /login page redirects to /courses — this is the
 * admin-specific version that redirects to /admin.
 */

import { NextResponse } from "next/server";
import { setAuthCookie } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import { performLogin } from "@/app/actions/login.action";

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData();
  const email = (form.get("email") as string | null) ?? "";
  const password = (form.get("password") as string | null) ?? "";
  const totpCode = (form.get("totpCode") as string | null) || undefined;

  const container = buildContainer();
  const outcome = await performLogin(
    container,
    { email, password, redirectTo: "/admin", totpCode },
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
    // Verify the user has ADMIN role before redirecting to /admin.
    const userResult = await container.userRepo.findById(outcome.userId);
    if (!userResult.ok || userResult.value.role !== "ADMIN") {
      // Do NOT plant the cookie — the user authenticated but lacks the
      // role required for /admin. Bounce them back to /admin-login with
      // the not_admin error. No cookie = no half-authenticated state.
      const url = new URL("/admin-login?error=not_admin", request.url);
      return NextResponse.redirect(url, { status: 303 });
    }

    // Plant the session cookie on the response we return, then 303 to
    // /admin. performLogin() already called setAuthCookie via the
    // implicit `cookies()` store, but a fresh NextResponse.redirect()
    // does NOT inherit those cookies — the same STORY-066 follow-up
    // bug that was fixed in /api/auth/login and /api/auth/signup, but
    // missed here when admin-login was added. Without this call the
    // browser lands on /admin with no session, and src/proxy.ts
    // bounces them straight back to /admin-login.
    //
    // `isHttps` is the single source of truth for both the Secure flag
    // AND the cookie name. Real production is HTTPS, so the Secure
    // flag and the `__Secure-` prefix both stay on.
    const isHttps = new URL(request.url).protocol === "https:";
    const response = NextResponse.redirect(new URL("/admin", request.url), {
      status: 303,
    });
    await setAuthCookie(outcome.sessionToken, outcome.expiresAt, response.cookies, {
      isHttps,
    });
    return response;
  }

  const errorCode =
    outcome.kind === "invalid_input"
      ? "invalid_input"
      : outcome.kind === "rate_limited"
        ? "rate_limited"
        : outcome.kind === "redirect_to_login"
          ? outcome.errorKind
          : "unexpected";

  const url = new URL(`/admin-login?error=${errorCode}`, request.url);
  return NextResponse.redirect(url, { status: 303 });
}
