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
 *
 * STORY-066 follow-up: `performLogin` does NOT call redirect()
 * itself. Calling redirect() from inside a callback loses the
 * Next.js request-scoped AsyncLocalStorage in production builds.
 * The action wrapper owns the redirect. See route.ts at
 * /api/auth/login for the new HTTP-based flow that supersedes
 * the server action for browser form posts.
 */

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { Login, type LoginOutput } from "@/usecases/Login";
import type { RateLimiter } from "@/ports/security/RateLimiter";

const LOGIN_EMAIL_RATE_LIMIT = { limit: 5, windowSeconds: 900 }; // 5 per 15 min
const LOGIN_IP_RATE_LIMIT = { limit: 20, windowSeconds: 900 }; // 20 per 15 min

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return h.get("x-real-ip")?.trim() || undefined;
}

/**
 * Pure login helper. Takes the container (so tests can pass
 * buildTestContainer), the email + password + redirectTo, and the
 * side-effect functions (plantCookie, getClientIp) as dependencies.
 *
 * Returns a discriminated union the caller maps to a Next.js redirect().
 * The cookie-setting is a side effect on the response (via next/headers),
 * done by the helper in src/lib/auth.ts.
 *
 * STORY-066 fix: the redirect is owned by the action wrapper
 * (`loginAndRedirect`), not by this helper. Calling `redirect()` from
 * inside a callback (`deps.navigate`) loses the Next.js request-scoped
 * AsyncLocalStorage in production builds, which manifests as a
 * "Server Components render" 500 with a hashed digest. The signup
 * wrapper (`signUpAndRedirect`) already follows this pattern — login
 * just hadn't been migrated.
 */
export type LoginResult =
  | { kind: "success"; redirectTo: string; userId: string }
  | { kind: "redirect_to_login"; errorKind: string }
  | { kind: "invalid_input" }
  | { kind: "rate_limited"; retryAfterSeconds: number };

export async function performLogin(
  container: { login: Login; rateLimiter: RateLimiter },
  input: { email: string; password: string; redirectTo: string },
  deps: {
    plantCookie: (token: string, expiresAt: Date) => Promise<void>;
    getClientIp: () => Promise<string | undefined>;
  },
): Promise<LoginResult> {
  if (!input.email || !input.password) {
    return { kind: "invalid_input" };
  }

  // Rate limit every login by normalized email, then apply the broader IP
  // bucket when the request has a trusted client IP.
  const emailLimitResult = await container.rateLimiter.check({
    key: `login:email:${input.email.toLowerCase()}`,
    ...LOGIN_EMAIL_RATE_LIMIT,
  });
  if (emailLimitResult.ok && !emailLimitResult.value.allowed) {
    return { kind: "rate_limited", retryAfterSeconds: emailLimitResult.value.resetSeconds };
  }
  if (!emailLimitResult.ok) {
    console.error("[performLogin] email rate limiter error:", emailLimitResult.error.message);
  }

  const ip = await deps.getClientIp();
  if (ip) {
    const ipLimitResult = await container.rateLimiter.check({
      key: `login:ip:${ip}`,
      ...LOGIN_IP_RATE_LIMIT,
    });
    if (ipLimitResult.ok && !ipLimitResult.value.allowed) {
      return { kind: "rate_limited", retryAfterSeconds: ipLimitResult.value.resetSeconds };
    }
    if (!ipLimitResult.ok) {
      console.error("[performLogin] IP rate limiter error:", ipLimitResult.error.message);
    }
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
  return { kind: "success", redirectTo: safeRedirect, userId: result.userId };
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
  if (outcome.kind === "success") {
    redirect(outcome.redirectTo);
  }
}

// NOTE: LoginOutput was previously re-exported here as
// `export type { LoginOutput }`. Removed because Next.js 16's bundler
// was emitting it as a value export, causing
// `ReferenceError: LoginOutput is not defined` at route handler
// build time. Import LoginOutput from "@/usecases/Login" directly.
