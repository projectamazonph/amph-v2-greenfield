"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { setAuthCookie } from "@/lib/auth";
import { SignUp, type SignUpOutput, type SignUpError } from "@/usecases/SignUp";
import { Login } from "@/usecases/Login";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { PasswordHasher } from "@/ports/security/PasswordHasher";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { RateLimiter } from "@/ports/security/RateLimiter";

const SIGNUP_RATE_LIMIT = { limit: 10, windowSeconds: 3600 };

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return h.get("x-real-ip")?.trim() || undefined;
}

/**
 * Pure signup helper. Returns a discriminated union — never calls
 * redirect() itself, so it's unit-testable without Next.js in scope.
 *
 * STORY-046 follow-up: the success variant no longer carries a
 * `redirectTo` field. The `signUpAndRedirect` server action below
 * owns the navigation, mirroring the `loginAndRedirect` pattern
 * (src/app/actions/login.action.ts).
 */
export type SignUpResult =
  | SignUpError
  | { kind: "success"; email: string }
  | { kind: "invalid_input" }
  | { kind: "rate_limited"; retryAfterSeconds: number }
  | { kind: "unexpected"; message: string };

export interface SignUpInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

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
    getClientIp: () => Promise<string | undefined>;
  },
): Promise<SignUpResult> {
  if (!input.email || !input.password || !input.firstName || !input.lastName) {
    return { kind: "invalid_input" };
  }
  const ip = await deps.getClientIp();
  if (ip) {
    const limitResult = await container.rateLimiter.check({
      key: `signup:ip:${ip}`,
      ...SIGNUP_RATE_LIMIT,
    });
    if (limitResult.ok && !limitResult.value.allowed) {
      return { kind: "rate_limited", retryAfterSeconds: limitResult.value.resetSeconds };
    }
    if (!limitResult.ok) {
      console.error("[performSignUp] rate limiter error:", limitResult.error.message);
    }
  }
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
    return { kind: "unexpected", message: err instanceof Error ? err.message : "Unknown error" };
  }
  if (!signUpResult.ok) return signUpResult.error;
  const { userId, email: signedUpEmail } = signUpResult;
  try {
    await container.resendVerification.execute({ userId });
  } catch (err) {
    console.error("[performSignUp] resend verification failed:", err);
  }
  try {
    const loginResult = await container.login.execute({
      email: input.email,
      password: input.password,
    });
    if (loginResult.ok) {
      await deps.plantCookie(loginResult.sessionToken, loginResult.expiresAt);
    }
  } catch (err) {
    console.error("[performSignUp] auto-login failed:", err);
  }
  return { kind: "success", email: signedUpEmail };
}

/**
 * Server action for the /signup form. Called by the form's `action={...}`.
 * Mirrors `loginAndRedirect` (src/app/actions/login.action.ts):
 * - calls `performSignUp`
 * - maps the result to a Next.js `redirect()` (success) or
 *   `redirect("/signup?error=...")` (failure)
 * - never returns normally — `redirect()` throws
 */
export async function signUpAndRedirect(formData: FormData): Promise<void> {
  const input: SignUpInput = {
    email: (formData.get("email") as string) ?? "",
    password: (formData.get("password") as string) ?? "",
    firstName: (formData.get("firstName") as string) ?? "",
    lastName: (formData.get("lastName") as string) ?? "",
  };

  const container = buildContainer();
  const outcome = await performSignUp(container, input, {
    plantCookie: setAuthCookie,
    getClientIp: clientIp,
  });

  if (outcome.kind === "success") {
    redirect("/dashboard");
  }
  // All failure paths land back on /signup with an `?error=...` query
  // param that SignupForm reads via useSearchParams to render an alert.
  redirect(`/signup?error=${outcome.kind}`);
}
