/**
 * Admin two-factor authentication server actions.
 *
 * Audit hardening follow-up (docs/audit-2026-07-26-hardening-review.md).
 * Thin shells over EnableTwoFactor/ConfirmTwoFactor/DisableTwoFactor —
 * parse, resolve the current session, call the use case, redirect.
 *
 * The pure `perform*` helpers are exported separately so they're
 * testable without the Next.js runtime (mirrors performLogin's split
 * in login.action.ts).
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import type { Result } from "@/domain/shared/Result";
import type { EnableTwoFactor, EnableTwoFactorResult } from "@/usecases/EnableTwoFactor";
import type { ConfirmTwoFactor, ConfirmTwoFactorResult } from "@/usecases/ConfirmTwoFactor";
import type { DisableTwoFactor, DisableTwoFactorResult } from "@/usecases/DisableTwoFactor";

// ── Testable pure helpers ────────────────────────────────────────

export async function performEnableTwoFactor(
  container: { enableTwoFactor: EnableTwoFactor },
  userId: string,
): Promise<EnableTwoFactorResult> {
  return container.enableTwoFactor.execute({ userId });
}

export async function performConfirmTwoFactor(
  container: { confirmTwoFactor: ConfirmTwoFactor },
  userId: string,
  code: string,
): Promise<ConfirmTwoFactorResult> {
  return container.confirmTwoFactor.execute({ userId, code });
}

export async function performDisableTwoFactor(
  container: { disableTwoFactor: DisableTwoFactor },
  userId: string,
  password: string,
): Promise<DisableTwoFactorResult> {
  return container.disableTwoFactor.execute({ userId, password });
}

function errorKind(result: Result<unknown, { kind: string }>): string {
  return !result.ok ? result.error.kind : "unknown";
}

// ── Action wrappers (thin shells) ────────────────────────────────

export async function enableTwoFactorAction(): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const container = buildContainer();
  const result = await performEnableTwoFactor(container, userId);
  if (!result.ok) {
    redirect(`/admin/settings?error=${errorKind(result)}`);
  }
  redirect("/admin/settings/2fa-setup");
}

export async function confirmTwoFactorAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const code = (formData.get("code") as string | null) ?? "";
  const container = buildContainer();
  const result = await performConfirmTwoFactor(container, userId, code);
  if (!result.ok) {
    redirect(`/admin/settings/2fa-setup?error=${errorKind(result)}`);
  }
  redirect("/admin/settings?2fa=enabled");
}

export async function disableTwoFactorAction(formData: FormData): Promise<void> {
  const userId = await getSessionUserId();
  if (!userId) redirect("/login");

  const password = (formData.get("password") as string | null) ?? "";
  const container = buildContainer();
  const result = await performDisableTwoFactor(container, userId, password);
  if (!result.ok) {
    redirect(`/admin/settings?error=${errorKind(result)}`);
  }
  redirect("/admin/settings?2fa=disabled");
}
