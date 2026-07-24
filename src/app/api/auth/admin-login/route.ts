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

  const container = buildContainer();
  const outcome = await performLogin(
    container,
    { email, password, redirectTo: "/admin" },
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
      const url = new URL("/admin-login?error=not_admin", request.url);
      return NextResponse.redirect(url, { status: 303 });
    }

    const url = new URL("/admin", request.url);
    return NextResponse.redirect(url, { status: 303 });
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
