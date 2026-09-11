/**
 * submitAssignment action — P1-02 (PR-C slice 2).
 *
 * Server action that flips the caller's own assignment to SUBMITTED.
 * The use case enforces assignee ownership; the action only injects
 * the session identity. Returns the use-case result so the client
 * can render the outcome inline.
 */

"use server";

import type { SubmitAssignmentResult } from "@/usecases/SubmitAssignment";
import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import { Result } from "@/domain/shared/Result";

export type SubmitAssignmentActionResult =
  | SubmitAssignmentResult
  | {
      ok: false;
      error: { kind: "unauthorized" };
    };

export async function submitAssignmentAction(
  assignmentId: string,
): Promise<SubmitAssignmentActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }

  const container = buildContainer();
  const result = await container.submitAssignment.execute({ userId, assignmentId });

  if (Result.isOk(result)) {
    return { ok: true, value: result.value };
  }
  return { ok: false, error: result.error };
}
