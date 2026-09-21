/**
 * welcome.action.ts — STORY-129.
 *
 * Thin server-action wrappers around the `CompleteWelcome` and
 * `ResetWelcome` use cases. The use cases are wired into the
 * composition container (Task 6); this file exposes them as Next.js
 * server actions so the welcome page (Task 9) and the profile
 * "restart welcome" link (Task 12) can call them from the client.
 *
 * `completeWelcomeAction` returns the domain `Result` directly so the
 * client-side `WelcomeStepper` can render inline messaging without
 * throwing across the server-action boundary.
 *
 * `resetWelcomeAction` is wired as a `<form action>` target on the
 * profile page (Task 12). It accepts the standard `(formData)`
 * signature, redirects to `/welcome` on success so the user lands
 * directly in the tour, and redirects back to `/profile` with an
 * `?welcome=reset_failed` flag if the underlying use case errors.
 * `redirect()` from `next/navigation` throws `NEXT_REDIRECT`, so
 * returning `Promise<void>` is intentional.
 */

"use server";

import { redirect } from "next/navigation";
import { buildContainer } from "@/composition/container";
import { getSessionUser } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

/**
 * Mirrors the use-case error shape so callers can distinguish
 * "user no longer exists" from "DB write failed" without parsing
 * opaque `message: "unknown"` strings. The `not_authenticated`
 * discriminator is added at the action layer because the use case
 * doesn't know whether there was a session — that's a transport-layer
 * concern.
 */
export type CompleteWelcomeActionError =
  | { kind: "not_authenticated" }
  | { kind: "not_found" }
  | { kind: "repo_error"; message: string };

export type CompleteWelcomeActionResult = Result<
  { completedAt: Date },
  CompleteWelcomeActionError
>;

export async function completeWelcomeAction(): Promise<CompleteWelcomeActionResult> {
  const user = await getSessionUser();
  if (!user) return Result.err({ kind: "not_authenticated" });

  const container = buildContainer();
  const result = await container.completeWelcome.execute({ userId: user.id });
  if (!result.ok) return Result.err(result.error);
  return Result.ok(result.value);
}

/**
 * Form-action entry point used by the profile "Restart the welcome
 * tour" button. Accepts the standard Next.js `(formData: FormData)`
 * shape — the form data is ignored because all the information the
 * use case needs (the current user's id) is resolved from the
 * session.
 *
 * On success, sends the user straight into the tour (`/welcome`). On
 * failure, sends them back to the profile with `?welcome=reset_failed`
 * so the page can show an inline error if it ever grows one.
 */
export async function resetWelcomeAction(_formData: FormData): Promise<void> {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  const container = buildContainer();
  const result = await container.resetWelcome.execute({ userId: user.id });
  if (!result.ok) {
    redirect("/profile?welcome=reset_failed");
  }
  redirect("/welcome");
}
