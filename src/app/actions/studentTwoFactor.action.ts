/**
 * Student two-factor authentication server actions.
 *
 * STORY-097. The underlying use cases (EnableTwoFactor/ConfirmTwoFactor/
 * DisableTwoFactor) are role-agnostic — this file just wraps the same
 * pure `perform*` helpers used by the admin flow (@/app/actions/twoFactor.action)
 * with student-facing redirect targets under /profile/security, so
 * enabling this doesn't route a student through any admin-only page.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { Result } from "@/domain/shared/Result";
import {
  performEnableTwoFactor,
  performConfirmTwoFactor,
  performDisableTwoFactor,
} from "@/app/actions/twoFactor.action";

function errorKind(result: Result<unknown, { kind: string }>): string {
  return !result.ok ? result.error.kind : "unknown";
}

export async function enableStudentTwoFactorAction(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const container = buildContainer();
  const result = await performEnableTwoFactor(container, userId);
  if (!result.ok) {
    redirect(`/profile/security?error=${errorKind(result)}`);
  }
  redirect("/profile/security/2fa-setup");
}

export async function confirmStudentTwoFactorAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const code = (formData.get("code") as string | null) ?? "";
  const container = buildContainer();
  const result = await performConfirmTwoFactor(container, userId, code);
  if (!result.ok) {
    redirect(`/profile/security/2fa-setup?error=${errorKind(result)}`);
  }
  redirect("/profile/security?2fa=enabled");
}

export async function disableStudentTwoFactorAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const password = (formData.get("password") as string | null) ?? "";
  const container = buildContainer();
  const result = await performDisableTwoFactor(container, userId, password);
  if (!result.ok) {
    redirect(`/profile/security?error=${errorKind(result)}`);
  }
  redirect("/profile/security?2fa=disabled");
}
