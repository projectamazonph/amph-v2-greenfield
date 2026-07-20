/**
 * Password reset server actions — STORY-008.
 *
 * Two actions:
 *   - requestPasswordResetAction: takes an email, always returns
 *     success (to prevent email enumeration).
 *   - resetPasswordAction: takes a token + new password, returns
 *     a result kind the page can show.
 *
 * The page form for /reset-password is a thin client component
 * using useActionState. For /reset-password/[token], the form
 * embeds the token in a hidden field and posts to the action.
 */

"use server";

import { headers } from "next/headers";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

export type RequestResetState = {
  kind: "idle" | "sent" | "rate_limited" | "validation_failed";
  message?: string;
  retryAfterSeconds?: number;
};

const INITIAL: RequestResetState = { kind: "idle" };

export async function requestPasswordResetAction(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const emailRaw = formData.get("email");
  const email = typeof emailRaw === "string" ? emailRaw : "";

  // Pull the IP for the rate-limit key.
  const hdrs = await headers();
  const ip =
    hdrs.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    hdrs.get("x-real-ip") ??
    "0.0.0.0";

  const container = buildContainer();
  const result = await container.requestPasswordReset.execute({ email, ip });
  if (Result.isOk(result)) {
    return { kind: "sent" };
  }
  if (result.error.kind === "rate_limited") {
    return {
      kind: "rate_limited",
      message: "Too many requests. Try again later.",
      retryAfterSeconds: Math.ceil(
        (result.error.resetAt.getTime() - Date.now()) / 1000,
      ),
    };
  }
  return { kind: "validation_failed", message: "Email format is invalid" };
}

export { INITIAL as initialRequestResetState };

// ── ResetPassword action ───────────────────────────────────────

export type ResetConfirmState = {
  kind:
    | "idle"
    | "success"
    | "invalid_token"
    | "token_expired"
    | "token_already_used"
    | "weak_password"
    | "db_error"
    | "error";
  message?: string;
};

export async function resetPasswordAction(
  _prev: ResetConfirmState,
  formData: FormData,
): Promise<ResetConfirmState> {
  const token = formData.get("token");
  const newPassword = formData.get("newPassword");
  if (typeof token !== "string" || typeof newPassword !== "string") {
    return { kind: "error", message: "Missing fields" };
  }
  const container = buildContainer();
  const result = await container.resetPassword.execute({ token, newPassword });
  if (Result.isOk(result)) {
    return { kind: "success" };
  }
  return {
    kind: result.error.kind,
    message: friendlyMessage(result.error.kind),
  };
}

function friendlyMessage(kind: string): string {
  switch (kind) {
    case "invalid_token":
      return "This reset link is not valid.";
    case "token_expired":
      return "This reset link has expired. Request a new one.";
    case "token_already_used":
      return "This reset link has already been used.";
    case "weak_password":
      return "The new password is too weak.";
    default:
      return "Something went wrong. Try again.";
  }
}
