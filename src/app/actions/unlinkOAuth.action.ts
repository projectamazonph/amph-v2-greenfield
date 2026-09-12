/**
 * unlinkOAuth action — P1-04 (PR-D).
 *
 * Server action removing one provider link for the signed-in
 * student. Redirects back to /profile/security with an outcome
 * code; the page renders the user-facing copy.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { isOAuthProvider } from "@/domain/entities/OAuthAccount";

export async function unlinkOAuthAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) {
    redirect("/login");
  }

  const provider = String(formData.get("provider") ?? "");
  if (!isOAuthProvider(provider)) {
    redirect("/profile/security?error=oauth_unknown");
  }

  const container = buildContainer();
  const result = await container.unlinkOAuthAccount.execute({ userId, provider });

  if (!result.ok) {
    redirect(`/profile/security?error=${result.error.kind}`);
  }
  redirect("/profile/security?unlinked=1");
}
