/**
 * recordRetrievalCheck action — LEARN-040 (STORY-138).
 *
 * Fire-and-forget from SelfCheck: resolves the session user, records
 * the attempt, and swallows storage failures so a failed write never
 * blocks the explanation the learner already sees.
 */

"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";

export interface RecordRetrievalCheckActionInput {
  lessonSlug: string;
  checkId: string;
  correct: boolean;
}

export type RecordRetrievalCheckActionResult =
  { ok: true } | { ok: false; error: { kind: string } };

export async function recordRetrievalCheckAction(
  input: RecordRetrievalCheckActionInput,
): Promise<RecordRetrievalCheckActionResult> {
  const userId = await getSessionUserId();
  if (!userId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  const container = buildContainer();
  const result = await container.recordRetrievalCheck.execute({
    actorId: userId,
    lessonSlug: input.lessonSlug,
    checkId: input.checkId,
    correct: input.correct,
  });
  if (!result.ok) {
    return { ok: false, error: { kind: result.error.kind } };
  }
  return { ok: true };
}
