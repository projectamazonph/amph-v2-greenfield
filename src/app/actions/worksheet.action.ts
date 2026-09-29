/**
 * saveWorksheetEntryAction — STORY-163 server action.
 *
 * Server-action shim over SaveWorksheetEntryUseCase. Resolves the
 * caller via getSessionUserId, returns "unauthorized" when there is
 * no session, then forwards the input. Domain-level rejections
 * (invalid_field, forbidden, db_error) come back as Result.err from
 * the use case; we map them onto the same Result shape on the wire.
 *
 * Audit row is emitted by the use case itself per AGENTS.md "Every
 * admin mutation logs" (worksheet saves are tier-2 mutations: who
 * changed what and when, no admin approval gate).
 */

"use server";

import { buildContainer } from "@/composition/container";
import { getSessionUserId } from "@/lib/auth";
import {
  isWorksheetLessonSlug,
  type WorksheetLessonSlug,
  type WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";

export interface SaveWorksheetEntryActionInput {
  studentId: string;
  lessonSlug: string;
  values: Record<string, string>;
}

export type SaveWorksheetEntryActionResult =
  | { ok: true; value: { savedAt: string } }
  | {
      ok: false;
      error: {
        kind: string;
        invalidKeys?: readonly string[];
      };
    };

export async function saveWorksheetEntryAction(
  input: SaveWorksheetEntryActionInput,
): Promise<SaveWorksheetEntryActionResult> {
  const actorId = await getSessionUserId();
  if (!actorId) {
    return { ok: false, error: { kind: "unauthorized" } };
  }
  if (actorId !== input.studentId) {
    return { ok: false, error: { kind: "forbidden" } };
  }
  if (!isWorksheetLessonSlug(input.lessonSlug)) {
    return { ok: false, error: { kind: "invalid_lesson" } };
  }
  const lessonSlug: WorksheetLessonSlug = input.lessonSlug;
  const container = buildContainer();
  const result = await container.saveWorksheetEntry.execute({
    studentId: input.studentId,
    actorId,
    lessonSlug,
    values: input.values as WorksheetValues,
  });
  if (!result.ok) {
    const error: { kind: string; invalidKeys?: readonly string[] } = {
      kind: result.error.kind,
    };
    if (result.error.kind === "invalid_field") {
      error.invalidKeys = result.error.invalidKeys;
    }
    return { ok: false, error };
  }
  return {
    ok: true,
    value: { savedAt: result.value.savedAt.toISOString() },
  };
}
