/**
 * verifyEmailAction — server action for /verify-email.
 *
 * STORY-007: the user clicks the link in their verification email.
 * We call VerifyEmail.execute() with the token, then either
 * redirect to /dashboard on success or back to /verify-email
 * with an error kind in the query string so the page can show
 * the right message.
 *
 * Never throws across the boundary: every error is caught and
 * returned as a redirect to /verify-email?error=<kind>.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { Result } from "@/domain/shared/Result";

export type VerifyEmailErrorKind =
  | "invalid_token"
  | "token_expired"
  | "token_already_used"
  | "missing_token"
  | "unexpected";

const ERROR_PATH: Record<string, string> = {
  invalid_token: "invalid-token",
  token_expired: "expired",
  token_already_used: "already-used",
  not_found: "invalid-token",
  missing_token: "missing-token",
};

export async function verifyEmailAction(formData: FormData): Promise<void> {
  const tokenRaw = formData.get("token");
  if (typeof tokenRaw !== "string" || tokenRaw.length === 0) {
    redirect(`/verify-email?error=missing-token`);
  }

  const container = buildContainer();
  const result = await container.verifyEmail.execute({ token: tokenRaw });

  if (Result.isOk(result)) {
    // Successful verification — bounce to dashboard.
    redirect("/dashboard?welcome=1");
  }

  const kind = result.error.kind;
  const slug = ERROR_PATH[kind] ?? "unexpected";
  redirect(`/verify-email?error=${slug}`);
}
