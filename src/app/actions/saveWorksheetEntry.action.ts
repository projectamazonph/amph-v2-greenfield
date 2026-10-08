"use server";

/**
 * saveWorksheetEntryAction — server action for the per-H2 worksheet
 * entry artifact.
 *
 * Resolves the actor from the session, refuses when no session exists
 * or the actor's userId does not match the input (a learner may only
 * save their own rows), then calls SaveWorksheetH2UseCase through the
 * production container. The use case handles unknown lesson slugs,
 * unknown H2 anchors, and invalid field keys; the action layer just
 * serializes the result for the client.
 *
 * Result shape on the wire matches what the React WorksheetEntry
 * component expects:
 *   { ok: true, value: { savedAt: string } }
 *   { ok: false, error: { kind: string, ... } }
 */

import { getSessionUserId } from "@/lib/auth";
import { buildContainer } from "@/composition/container";
import {
  isWorksheetLessonSlug,
  validateWorksheetH2Values,
  WorksheetValidationError,
} from "@/domain/artifacts/worksheetEntry";

export interface SaveWorksheetEntryActionInput {
  /** Optional override for the actor. Server ignores if it differs from the session. */
  studentId?: string;
  lessonSlug: string;
  h2Anchor: string;
  values: Readonly<Record<string, string>>;
}

export type SaveWorksheetEntryActionResult =
  | { ok: true; value: { savedAt: string } }
  | { ok: false; error: { kind: string; [k: string]: unknown } };

export async function saveWorksheetEntryAction(
  input: SaveWorksheetEntryActionInput,
): Promise<SaveWorksheetEntryActionResult> {
  const sessionUserId = await getSessionUserId();
  if (!sessionUserId) {
    return { ok: false, error: { kind: "unauthenticated" } };
  }
  if (input.studentId && input.studentId !== "__self__" && input.studentId !== sessionUserId) {
    return { ok: false, error: { kind: "forbidden_actor" } };
  }
  if (!isWorksheetLessonSlug(input.lessonSlug)) {
    return { ok: false, error: { kind: "invalid_lesson_slug" } };
  }
  try {
    // Normalize the input map before reaching the port so we never
    // call the use case with an unknown field key that would just be
    // bounced back as an error. The use case re-runs the same
    // validator inside, so this is purely a UX nicety.
    validateWorksheetH2Values(input.lessonSlug, input.h2Anchor, input.values);
  } catch (e) {
    if (e instanceof WorksheetValidationError) {
      return {
        ok: false,
        error: { kind: "invalid_keys", invalidKeys: e.invalidKeys },
      };
    }
    return { ok: false, error: { kind: "invalid_h2_anchor" } };
  }
  const container = buildContainer();
  const result = await container.saveWorksheetH2.execute({
    studentId: sessionUserId,
    actorId: sessionUserId,
    lessonSlug: input.lessonSlug,
    h2Anchor: input.h2Anchor,
    values: input.values,
  });
  if (!result.ok) {
    return { ok: false, error: { ...result.error } };
  }
  return { ok: true, value: { savedAt: new Date().toISOString() } };
}
