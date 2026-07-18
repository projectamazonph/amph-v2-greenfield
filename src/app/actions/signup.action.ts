/**
 * SignUp server action — Story 004 + STORY-006.
 *
 * The only responsibility of this file is to:
 * 1. Receive the raw form input from the React component
 * 2. Call the SignUp use case
 * 3. On success, call the Login use case + setAuthCookie so the user
 *    is auto-signed-in (no separate login step needed after signup)
 * 4. Return a serializable result (no class instances cross the RPC boundary)
 *
 * ADR-020: Server actions are the "thin shell" — no business logic here.
 * The business logic lives in src/usecases/SignUp.ts and
 * src/usecases/Login.ts. The cookie-setting is a side effect on the
 * response (via next/headers), done by the helper in src/lib/auth.ts.
 */

"use server";

import { SignUp } from "@/usecases/SignUp";
import { buildContainer } from "@/composition/container";
import { Argon2PasswordHasher } from "@/infra/security/Argon2PasswordHasher";
import { setAuthCookie } from "@/lib/auth";

export type SignUpState =
  | { status: "idle" }
  | { status: "success"; email: string }
  | {
      status: "error";
      error:
        | { kind: "email_taken" }
        | { kind: "weak_password"; score: number }
        | { kind: "invalid_name"; field: "firstName" | "lastName" }
        | { kind: "invalid_email" }
        | { kind: "db_error"; message: string }
        | { kind: "unexpected"; message: string };
    };

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData,
): Promise<SignUpState> {
  const input = {
    email: formData.get("email") as string | null,
    password: formData.get("password") as string | null,
    firstName: formData.get("firstName") as string | null,
    lastName: formData.get("lastName") as string | null,
  };

  // Basic null check before calling use case
  if (!input.email || !input.password || !input.firstName || !input.lastName) {
    return {
      status: "error",
      error: { kind: "invalid_email" }, // degenerate case — shouldn't reach here with proper form validation
    };
  }

  try {
    const container = buildContainer();
    const useCase = new SignUp(
      container.userRepo,
      container.idGen,
      container.clock,
      new Argon2PasswordHasher(),
    );

    const result = await useCase.execute({
      email: input.email,
      password: input.password,
      firstName: input.firstName,
      lastName: input.lastName,
    });

    if (!result.ok) {
      return { status: "error", error: result.error };
    }

    // Auto-login: immediately create a session + set the cookie.
    // This is the "no separate login step" UX. The user lands on the
    // dashboard right after signing up.
    const loginResult = await container.login.execute({
      email: input.email,
      password: input.password,
    });
    if (loginResult.ok) {
      await setAuthCookie(loginResult.sessionToken, loginResult.expiresAt);
    }
    // If auto-login fails (very unlikely right after signup — the
    // password is the one we just hashed), the user will see a
    // success message and can manually log in. The success state
    // still fires; we don't surface the auto-login failure.

    return { status: "success", email: result.email };
  } catch (err) {
    // TODO: Sentry.captureException in production
    console.error("[signUpAction] unexpected error:", err);
    return {
      status: "error",
      error: { kind: "unexpected", message: "An unexpected error occurred." },
    };
  }
}
