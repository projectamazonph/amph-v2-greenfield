"use server";

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

const SIGNUP_RATE_LIMIT = { limit: 10, windowSeconds: 3600 };

async function clientIp(): Promise<string | undefined> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return (forwarded.split(",")[0] ?? forwarded).trim();
  return h.get("x-real-ip")?.trim() || undefined;
}

export type SignUpResult =
  | { kind: "success"; email: string; redirectTo?: string }
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
  let loginResult: Awaited<ReturnType<Login["execute"]>>;
  try {
    loginResult = await container.login.execute({ email: input.email, password: input.password });
  } catch (err) {
    console.error("[performSignUp] auto-login failed:", err);
    return { kind: "success", email: signedUpEmail };
  }
  if (!loginResult.ok) return { kind: "success", email: signedUpEmail };
  try {
    await deps.plantCookie(loginResult.sessionToken, loginResult.expiresAt);
  } catch (err) {
    console.error("[performSignUp] plantCookie failed:", err);
    return { kind: "success", email: signedUpEmail };
  }
  return { kind: "success", email: signedUpEmail, redirectTo: "/dashboard" };
}

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
    return await performSignUp(container, input, {
      plantCookie: setAuthCookie,
      getClientIp: clientIp,
    });
  } catch (err) {
    console.error("[signUpAction] unexpected error:", err);
    return {
      kind: "unexpected",
      message: err instanceof Error ? err.message : "Unknown error",
    } as const;
  }
}

export type SignUpState = SignUpResult | { kind: "idle" };
