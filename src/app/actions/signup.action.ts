/**
 * SignUp server action — Story 004 + STORY-006.
 *
 * The action itself is a thin shell: it receives form data, calls
 * performSignUp (a pure helper), and maps the result to a Next.js
 * redirect. The testable logic lives in `performSignUp` so it can be
 * unit-tested without mocking the Next runtime.
 *
 * SOLID notes:
 * - The action does NOT instantiate its own hasher; it reads
 *   `container.passwordHasher` (the single source of truth for which
 *   hasher is used in prod vs test). This is dependency inversion
 *   at the composition root.
 * - `performSignUp` takes the container + side-effect deps as params,
 *   so the helper has no implicit dependencies on globals.
 * - Auto-login is best-effort: if `Login.execute()` or the cookie
 *   setter fails for any reason, the signup still reports success.
 *   The user perceives "I created an account"; if they then can't
 *   access protected pages, the LoginForm is right there.
 * - The thin action wrapper never throws; unexpected exceptions are
 *   caught and returned as `{ kind: "unexpected" }`.
 */

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { SignUp, type SignUpOutput, type SignUpError } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { RateLimiter } from "@/ports/security/RateLimiter";

const SIGNUP_RATE_LIMIT = { limit: 10, windowSeconds: 3600 }; // 10 per hour

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return h.get("x-real-ip")?.trim() || undefined;
}

/**
 * The discriminated union returned to the action wrapper (and to the
 * page via useActionState). Mirrors the error variants of the SignUp
 * use case + adds `invalid_input` for the action's own null checks +
 * `unexpected` for caught exceptions.
 */
export type SignUpResult =
  | { kind: "success"; email: string }
  | SignUpError
  | { kind: "invalid_input" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unexpected"; message: string };

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

/**
 * Pure signup helper. Testable without Next runtime.
 *
 * Sequence:
 * 1. Validate that all four fields are non-empty (fail fast).
 * 2. Call SignUp use case (which checks email uniqueness, hashes the
 *    password, persists the user). Use case exceptions are caught and
 *    mapped to `unexpected`.
 * 3. On signup success, call Login use case + plantCookie + navigate.
 *    If the auto-login fails for any reason, still return success —
 *    the user's account exists; they can manually log in.
 *
 * The `deps` object carries the side-effect functions (plantCookie,
 * navigate, getClientIp) so this helper is unit-testable.
 */
export async function performSignUp(
  container: {
    userRepo: UserRepository;
    passwordHasher: PasswordHasher;
    idGen: IdGenerator;
    clock: Clock;
    login: Login;
    rateLimiter: RateLimiter;
    resendVerification: import("@/usecases/auth/ResendVerification").ResendVerification;
  },
  input: SignUpInput,
  deps: {
    plantCookie: (token: string, expiresAt: Date) => Promise<void>;
    navigate: (url: string) => never;
    getClientIp: () => Promise<string | undefined>;
  },
): Promise<SignUpResult> {
  // 1. Input validation
  if (!input.email || !input.password || !input.firstName || !input.lastName) {
    return { kind: "invalid_input" };
  }

  // 2. Rate limit by client IP. Skip the IP bucket if the proxy did not
  // provide one, rather than grouping unrelated requests under a fallback.
  const ip = await deps.getClientIp();
  if (ip) {
    const limitResult = await container.rateLimiter.check({
      key: `signup:ip:${ip}`,
      ...SIGNUP_RATE_LIMIT,
    });
    if (limitResult.ok && !limitResult.value.allowed) {
      return {
        kind: "rate_limited",
        retryAfterSeconds: limitResult.value.resetSeconds,
      };
    }
    if (!limitResult.ok) {
      // Rate limiter failed (Redis down, misconfig) — fail open so real users
      // aren't blocked by infrastructure. Log it.
      console.error("[performSignUp] rate limiter error:", limitResult.error.message);
    }
  }

  // 3. Call the SignUp use case
  let signUpResult: SignUpOutput;

  try {
    const useCase = new SignUp(
      container.userRepo,
      container.idGen,
      container.clock,
      container.passwordHasher,
    );
    signUpResult = await useCase.execute(input);
  } catch (err) {
    console.error("[performSignUp] use case threw:", err);
    return {
      kind: "unexpected",
      message: err instanceof Error ? err.message : "Unknown error",
    };
  }

  if (!signUpResult.ok) {
    // SignUpError variants are a 1:1 subset of SignUpResult's error
    // variants. Return them directly — no remapping needed.
    return signUpResult.error;
  }

  // From here on, signUpResult is narrowed to the success branch.
  // Extract the user data now so the rest of the function doesn't
  // need to keep narrowing.
  const { userId, email: signedUpEmail } = signUpResult;

  // Issue the verification token + send the email. Fire-and-forget
  // from the user's perspective — if it fails (rate limit, email
  // provider down), signup still succeeds. The user can request
  // a new email from /verify-email/sent.
  try {
    await container.resendVerification.execute({ userId });
  } catch (err) {
    console.error("[performSignUp] resend verification failed:", err);
  }

  // 4. Auto-login (best-effort). If it fails, still return success.
  //
  // IMPORTANT: do NOT wrap the navigate() call in try/catch. The
  // navigate() mock (and Next's real redirect()) throw a
  // NEXT_REDIRECT sentinel to do control flow. If we catch it, the
  // user sees the success state but never actually navigates.
  //
  // The flow is:
  //   - If login.execute() throws unexpectedly, swallow (signup is still
  //     success; the user can manually log in).
  //   - If plantCookie() throws unexpectedly, swallow.
  //   - If navigate() throws, let it bubble — that's the redirect.
  let loginResult: Awaited<ReturnType<Login["execute"]>>;
  try {
    loginResult = await container.login.execute({
      email: input.email,
      password: input.password,
    });
  } catch (err) {
    console.error("[performSignUp] auto-login (Login.execute) failed:", err);
    return { kind: "success", email: signedUpEmail };
  }

  if (!loginResult.ok) {
    // Login returned a non-ok result — signup still succeeded.
    return { kind: "success", email: signedUpEmail };
  }

  try {
    await deps.plantCookie(loginResult.sessionToken, loginResult.expiresAt);
  } catch (err) {
    console.error("[performSignUp] auto-login (plantCookie) failed:", err);
    return { kind: "success", email: signedUpEmail };
  }

  // navigate() throws — that's the redirect. Do NOT catch.
  deps.navigate("/dashboard");
  // Unreachable.
  return { kind: "success", email: signedUpEmail };
}

/**
 * Server action for the /signup form. Receives the form data, calls
 * the pure helper, and maps the result to a Next.js redirect on
 * success. This is the thin shell — the business logic is in
 * performSignUp.
 */
export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const input: SignUpInput = {
    email: (formData.get("email") as string) ?? "",
    password: (formData.get("password") as string) ?? "",
    firstName: (formData.get("firstName") as string) ?? "",
    lastName: (formData.get("lastName") as string) ?? "",
  };

  try {
    const container = buildContainer();
    const result = await performSignUp(container, input, {
      plantCookie: setAuthCookie,
      navigate: (url) => redirect(url),
      getClientIp: clientIp,
    });
    return result;
  } catch (err) {
    // performSignUp doesn't throw (it catches use case + auto-login
    // errors), but the navigate() call DOES throw on success. That's
    // the expected Next control-flow — let it bubble.
    throw err;
  }
}

// Re-export for the page (which uses useActionState)
export type SignUpState = SignUpResult;
