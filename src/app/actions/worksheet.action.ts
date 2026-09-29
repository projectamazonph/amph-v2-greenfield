/**
 * saveWorksheetEntryAction — server action for STORY-163.
 *
 * Stub for the Commit 11 React component test. Commit 12 fills in the
 * real implementation: getSessionUserId, SaveWorksheetEntryUseCase,
 * audit log row, Result-shimmed return shape. The stub returns ok
 * with a fixed timestamp so the component's UI state machine has
 * something to render during tests.
 *
 * DELETE this stub and replace with the real action in Commit 12.
 */
"use server";

export interface SaveWorksheetEntryActionInput {
  studentId: string;
  lessonSlug: string;
  values: Record<string, string>;
}

export type SaveWorksheetEntryActionResult =
  | { ok: true; value: { savedAt: string } }
  | { ok: false; error: { kind: string; invalidKeys?: readonly string[] } };

export async function saveWorksheetEntryAction(
  input: SaveWorksheetEntryActionInput,
): Promise<SaveWorksheetEntryActionResult> {
  // TODO(commit-12): replace with the real implementation.
  void input;
  return {
    ok: true,
    value: { savedAt: new Date("2026-09-29T12:00:00.000Z").toISOString() },
  };
}
