/**
 * SaveWorksheetEntry — write one row of the Module 1 worksheet.
 *
 * STORY-163. The React side passes the full set of field values for
 * one lesson; the use case validates the keys against the lesson's
 * allow-list, calls the port's upsert, then logs an audit row with
 * action `worksheet.saved`. Audit failures are swallowed per AGENTS.md
 * "RecordAuditLog should swallow db_error" — a failed audit row must
 * not fail the business operation.
 *
 * Authorization: the caller is always the student themselves in v1.
 * `actorId !== studentId` is rejected so a forged client cannot write
 * another student's sheet. AGENTS.md "Don't let students write each
 * other's artefacts" applies even though this isn't an artefact; the
 * shape is the same.
 */

import { Result } from "@/domain/shared/Result";
import {
  validateWorksheetValues,
  type WorksheetLessonSlug,
  type WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";
import type { WorksheetRepository, WorksheetError } from "@/ports/repositories/WorksheetRepository";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export type SaveWorksheetEntryError =
  | { kind: "forbidden" }
  | { kind: "invalid_field"; invalidKeys: readonly string[] }
  | WorksheetError;

export interface SaveWorksheetEntryInput {
  /** The student whose row is being written. */
  studentId: string;
  lessonSlug: WorksheetLessonSlug;
  /** Raw map from the client. Validated server-side before persistence. */
  values: Readonly<Record<string, string>>;
  /** The actor making the call; must equal studentId. */
  actorId: string;
}

export interface SaveWorksheetEntryDeps {
  worksheetRepo: WorksheetRepository;
  recordAuditLog: RecordAuditLog;
  clock: Clock;
}

export interface SaveWorksheetEntryResult {
  savedAt: Date;
  lessonSlug: WorksheetLessonSlug;
}

export class SaveWorksheetEntry {
  constructor(private readonly deps: SaveWorksheetEntryDeps) {}

  async execute(
    input: SaveWorksheetEntryInput,
  ): Promise<Result<SaveWorksheetEntryResult, SaveWorksheetEntryError>> {
    if (input.actorId !== input.studentId) {
      return Result.err({ kind: "forbidden" });
    }

    let normalized: WorksheetValues;
    try {
      normalized = validateWorksheetValues(input.lessonSlug, input.values);
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "invalidKeys" in err &&
        Array.isArray((err as { invalidKeys: unknown }).invalidKeys)
      ) {
        return Result.err({
          kind: "invalid_field",
          invalidKeys: (err as { invalidKeys: readonly string[] }).invalidKeys,
        });
      }
      throw err;
    }

    const updatedAt = this.deps.clock.now();
    const upsertResult = await this.deps.worksheetRepo.upsert({
      studentId: input.studentId,
      lessonSlug: input.lessonSlug,
      values: normalized,
      actorId: input.actorId,
      updatedAt,
    });
    if (!upsertResult.ok) {
      return Result.err(upsertResult.error);
    }

    // Audit row — best-effort. RecordAuditLog swallows its own errors.
    await this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "worksheet.saved",
      targetType: "worksheet",
      targetId: `${input.studentId}:${input.lessonSlug}`,
      metadata: {
        lessonSlug: input.lessonSlug,
        fieldCount: Object.keys(normalized).length,
        nonEmptyCount: Object.values(normalized).filter((v) => v !== "").length,
      },
    });

    return Result.ok({
      savedAt: upsertResult.value.savedAt,
      lessonSlug: input.lessonSlug,
    });
  }
}
