/**
 * resendVerificationAction — server action for the "Resend" button
 * on /verify-email/sent.
 *
 * STORY-007: if the user didn't receive the email, they can ask
 * for a new one. We need them to be logged in (or at least have
 * a session) so we can identify which user to resend for. If
 * they're not logged in, we send them to /login.
 *
 * The action returns to /verify-email/sent?status=<kind> so the
 * page can show "Sent" or "Already verified" or "Rate limited,
 * try again in N seconds".
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

export async function resendVerificationAction(): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=/verify-email/sent");
  }

  const container = buildContainer();
  const result = await container.resendVerification.execute({ userId: user.id });

  if (Result.isOk(result)) {
    const { sent, retryAfter } = result.value;
    if (sent) {
      redirect("/verify-email/sent?status=sent");
    }
    redirect(`/verify-email/sent?status=already-verified&retryAfter=${retryAfter.toISOString()}`);
  }

  if (result.error.kind === "rate_limited") {
    redirect(
      `/verify-email/sent?status=rate-limited&retryAfter=${result.error.retryAfter.toISOString()}`,
    );
  }
  if (result.error.kind === "already_verified") {
    redirect("/verify-email/sent?status=already-verified");
  }
  redirect("/verify-email/sent?status=error");
}
