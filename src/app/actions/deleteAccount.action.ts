/**
 * deleteAccount.action.ts — server action.
 *
 * STORY-096. Requires the current password (re-confirmation for a
 * destructive, irreversible action). On success, clears the session
 * cookie and redirects to the landing page — the account no longer
 * has a valid session to redirect back into.
 */
"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { clearAuthCookie } from "@/lib/auth";

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const password = (formData.get("password") as string | null) ?? "";
  const container = buildContainer();
  const result = await container.deleteUserAccount.execute({ userId, password });

  if (!result.ok) {
    redirect(`/profile/data?error=${result.error.kind}`);
  }

  await clearAuthCookie();
  redirect("/?accountDeleted=1");
}
