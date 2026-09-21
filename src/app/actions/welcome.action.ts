/**
 * welcome.action.ts — STORY-129.
 *
 * Thin server-action wrappers around the `CompleteWelcome` and
 * `ResetWelcome` use cases. The use cases are wired into the
 * composition container (Task 6); this file exposes them as Next.js
 * server actions so the welcome page (Task 9) and the profile
 * "restart welcome" link (Task 12) can call them from the client.
 *
 * Both actions resolve the current user via `getSessionUser()` and
 * forward `userId` to the underlying use case. They return the
 * domain `Result` directly — discriminated union on `ok` / `error.kind`
 * — so the calling component can render an inline message without
 * throwing across the server-action boundary.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

export type CompleteWelcomeActionResult = Result<
  { completedAt: Date },
  { kind: "not_authenticated" } | { kind: "error"; message: string }
>;

export type ResetWelcomeActionResult = Result<
  void,
  { kind: "not_authenticated" } | { kind: "error"; message: string }
>;

export async function completeWelcomeAction(): Promise<CompleteWelcomeActionResult> {
  const user = await getSessionUser();
  if (!user) return Result.err({ kind: "not_authenticated" });

  const container = buildContainer();
  const result = await container.completeWelcome.execute({ userId: user.id });
  if (!result.ok) return Result.err({ kind: "error", message: "unknown" });
  return Result.ok(result.value);
}

export async function resetWelcomeAction(): Promise<ResetWelcomeActionResult> {
  const user = await getSessionUser();
  if (!user) return Result.err({ kind: "not_authenticated" });

  const container = buildContainer();
  const result = await container.resetWelcome.execute({ userId: user.id });
  if (!result.ok) return Result.err({ kind: "error", message: "unknown" });
  return Result.ok(undefined);
}
