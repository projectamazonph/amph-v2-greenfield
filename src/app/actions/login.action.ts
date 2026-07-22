/**
 * Login server action — STORY-006.
 *
 * The only responsibility of this file is to:
 * 1. Receive the raw form input from the React component
 * 2. Call the Login use case
 * 3. On success, set the auth cookie via src/lib/auth.ts
 * 4. Return a serializable result (no class instances cross the RPC boundary)
 *
 * ADR-020: Server actions are the "thin shell" — no business logic here.
 * The business logic (auth + session record creation) lives in
 * src/usecases/Login.ts. The cookie-setting is a side effect on the
 * response (via next/headers), done by the helper in src/lib/auth.ts.
 *
 * The core logic is in `performLogin` (pure, testable without Next).
 * The exported `loginAndRedirect` is the action wrapper that calls
 * the framework functions (redirect, setAuthCookie). This split is
 * the standard Next pattern: the action is the thin shell, the pure
 * function holds the logic.
 */

"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { Login, type LoginOutput } from "@/usecases/Login";
import type { Result } from "@/domain/shared/Result";
import type { RateLimiter } from "@/ports/security/RateLimiter";

// STORY-054: standard brute-force protection buckets, mirroring
// RequestPasswordReset's email+IP two-tier pattern.
const LOGIN_EMAIL_LIMIT = 5;
const LOGIN_EMAIL_WINDOW_SECONDS = 900;
const LOGIN_IP_LIMIT = 20;
const LOGIN_IP_WINDOW_SECONDS = 900;

/**
 * Pure login helper. Takes the container (so tests can pass
 * buildTestContainer), the email + password + redirectTo, and the
 * side-effect functions (plantCookie, navigate) as dependencies.
 *
 * Returns a discriminated union the caller maps to a redirect.
 * The side-effect functions are injected so the helper is unit-testable
 * without Next's cookies() or redirect() in scope.
 */
export type LoginResult =
  | { kind: "success"; redirectTo: string }
  | { kind: "redirect_to_login"; errorKind: string }
  | { kind: "invalid_input" }
  | { kind: "rate_limited" };

export async function performLogin(
  container: { login: Login; rateLimiter: RateLimiter },
  input: { email: string; password: string; redirectTo: string; ip?: string },
  deps: {
    plantCookie: (token: string, expiresAt: Date) => Promise<void>;
    navigate: (url: string) => never;
  },
): Promise<LoginResult> {
  if (!input.email || !input.password) {
    return { kind: "invalid_input" };
  }

  // Rate limit by email AND by IP (STORY-054). Fails open (allowed)
  // if the limiter itself errors, matching RequestPasswordReset.
  const ip = input.ip ?? "0.0.0.0";
  const emailRL = await container.rateLimiter.check({
    key: `login:email:${input.email.toLowerCase()}`,
    limit: LOGIN_EMAIL_LIMIT,
    windowSeconds: LOGIN_EMAIL_WINDOW_SECONDS,
  });
  if (emailRL.ok && !emailRL.value.allowed) {
    return { kind: "rate_limited" };
  }
  const ipRL = await container.rateLimiter.check({
    key: `login:ip:${ip}`,
    limit: LOGIN_IP_LIMIT,
    windowSeconds: LOGIN_IP_WINDOW_SECONDS,
  });
  if (ipRL.ok && !ipRL.value.allowed) {
    return { kind: "rate_limited" };
  }

  // Reject open redirects: only allow relative paths starting with
  // a single `/` (defense against `//evil.com` protocol-relative
  // trickery AND `https://evil.com` absolute URLs).
  const safeRedirect =
    input.redirectTo.startsWith("/") && !input.redirectTo.startsWith("//")
      ? input.redirectTo
      : "/courses";

  const result = await container.login.execute({
    email: input.email,
    password: input.password,
  });

  if (!result.ok) {
    return { kind: "redirect_to_login", errorKind: result.error.kind };
  }

  await deps.plantCookie(result.sessionToken, result.expiresAt);
  deps.navigate(safeRedirect);

  // Unreachable — navigate() throws.
  return { kind: "success", redirectTo: safeRedirect };
}

/**
 * Server action for the /login form. Called by the form's `action={...}`.
 * Delegates to performLogin, then maps the result to a Next.js redirect().
 */
export async function loginAndRedirect(formData: FormData): Promise<void> {
  const email = formData.get("email") as string | null;
  const password = formData.get("password") as string | null;
  const redirectTo = (formData.get("redirectTo") as string | null) ?? "/courses";

  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ?? hdrs.get("x-real-ip") ?? "0.0.0.0";

  const container = buildContainer();

  const outcome = await performLogin(
    container,
    { email: email ?? "", password: password ?? "", redirectTo, ip },
    {
      plantCookie: setAuthCookie,
      navigate: (url) => redirect(url),
    },
  );

  if (outcome.kind === "invalid_input") {
    redirect("/login?error=invalid_input");
  }
  if (outcome.kind === "rate_limited") {
    redirect("/login?error=rate_limited");
  }
  if (outcome.kind === "redirect_to_login") {
    redirect(`/login?error=${outcome.errorKind}`);
  }
  // outcome.kind === "success" — performLogin already navigated.
}

// Re-exported for test convenience. The non-pure side effects are
// not re-exported.
export type { LoginOutput };
