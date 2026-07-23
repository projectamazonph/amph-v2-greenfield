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

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { Login, type LoginOutput } from "@/usecases/Login";
import type { RateLimiter } from "@/ports/security/RateLimiter";

const LOGIN_RATE_LIMIT = { limit: 10, windowSeconds: 900 }; // 10 per 15 min

async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  const realIp = h.get("x-real-ip");
  return realIp ?? "unknown";
}

/**
 * Pure login helper. Takes the container (so tests can pass
 * buildTestContainer), the email + password + redirectTo, and the
 * side-effect functions (plantCookie, navigate, getClientIp) as dependencies.
 *
 * Returns a discriminated union the caller maps to a redirect.
 * The side-effect functions are injected so the helper is unit-testable
 * without Next's cookies() or redirect() in scope.
 */
export type LoginResult =
  | { kind: "success"; redirectTo: string }
  | { kind: "redirect_to_login"; errorKind: string }
  | { kind: "invalid_input" }
  | { kind: "rate_limited"; retryAfterSeconds: number };

export async function performLogin(
  container: { login: Login; rateLimiter: RateLimiter },
  input: { email: string; password: string; redirectTo: string },
  deps: {
    plantCookie: (token: string, expiresAt: Date) => Promise<void>;
    navigate: (url: string) => never;
    getClientIp: () => Promise<string>;
  },
): Promise<LoginResult> {
  if (!input.email || !input.password) {
    return { kind: "invalid_input" };
  }

  // Rate limit by client IP
  const ip = await deps.getClientIp();
  const limitResult = await container.rateLimiter.check({
    key: `login:${ip}`,
    ...LOGIN_RATE_LIMIT,
  });
  if (limitResult.ok && !limitResult.value.allowed) {
    return { kind: "rate_limited", retryAfterSeconds: limitResult.value.resetSeconds };
  }
  if (!limitResult.ok) {
    console.error("[performLogin] rate limiter error:", limitResult.error.message);
  }

  // Reject open redirects — only allow relative paths starting with
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

  const container = buildContainer();

  const outcome = await performLogin(
    container,
    { email: email ?? "", password: password ?? "", redirectTo },
    {
      plantCookie: setAuthCookie,
      navigate: (url) => redirect(url),
      getClientIp: clientIp,
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
