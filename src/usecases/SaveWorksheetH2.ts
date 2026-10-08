/**
 * SaveWorksheetH2 — student persists the full H2 (all field keys) for
 * one (lessonSlug, h2Anchor).
 *
 * Three guards before the port write:
 *   1. actorId === studentId (a learner may only save their own rows)
 *   2. h2Anchor is in WORKSHEET_H2_SPECS for the lesson
 *   3. every input fieldKey is in the spec's registered fieldKeys
 *      (unknown keys throw inside validateWorksheetH2Values and are
 *      converted to Result.err here)
 *
 * Audit: emits "worksheet.saved" on success, "worksheet.save_failed"
 * on any error. Audit failures are swallowed per AGENTS.md
 * RecordAuditLog contract so the save still succeeds when the audit
 * log itself is unhealthy.
 */

import { Result } from "@/domain/shared/Result";
import {
  WorksheetValidationError,
  isWorksheetLessonSlug,
  isValidH2Anchor,
  validateWorksheetH2Values,
  type WorksheetLessonSlug,
} from "@/domain/artifacts/worksheetEntry";
import type {
  IWorksheetRepository,
  WorksheetSaveError,
} from "@/ports/repositories/IWorksheetRepository";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface SaveWorksheetH2Input {
  readonly studentId: string;
  readonly actorId: string;
  readonly lessonSlug: string;
  readonly h2Anchor: string;
  /** Field-keyed map. The use case fills in missing keys with "". */
  readonly values: Readonly<Record<string, string>>;
}

export type SaveWorksheetH2Error =
  | WorksheetSaveError
  | { kind: "forbidden_actor" }
  | { kind: "invalid_lesson_slug" }
  | { kind: "invalid_h2_anchor" };

export type SaveWorksheetH2Result = Result<void, SaveWorksheetH2Error>;

export interface SaveWorksheetH2Deps {
  worksheetRepo: IWorksheetRepository;
  recordAuditLog: RecordAuditLog;
  clock?: () => Date;
  idGen?: () => string;
}

export class SaveWorksheetH2 {
  constructor(private readonly deps: SaveWorksheetH2Deps) {}

  async execute(input: SaveWorksheetH2Input): Promise<SaveWorksheetH2Result> {
    const audit = async (
      action: "worksheet.saved" | "worksheet.save_failed",
      metadata: Record<string, unknown>,
    ) => {
      try {
        await this.deps.recordAuditLog.execute({
          actorId: input.actorId,
          action,
          targetType: "worksheet_entry",
          targetId: `${input.studentId}::${input.lessonSlug}::${input.h2Anchor}`,
          metadata,
        });
      } catch {
        // Audit failures must not fail the save.
      }
    };

    if (input.actorId !== input.studentId) {
      await audit("worksheet.save_failed", { outcome: "forbidden_actor" });
      return Result.err({ kind: "forbidden_actor" });
    }
    if (!isWorksheetLessonSlug(input.lessonSlug)) {
      await audit("worksheet.save_failed", { outcome: "invalid_lesson_slug" });
      return Result.err({ kind: "invalid_lesson_slug" });
    }
    const lessonSlug: WorksheetLessonSlug = input.lessonSlug;
    if (!isValidH2Anchor(lessonSlug, input.h2Anchor)) {
      await audit("worksheet.save_failed", { outcome: "invalid_h2_anchor" });
      return Result.err({ kind: "invalid_h2_anchor" });
    }

    let normalized: Readonly<Record<string, string>>;
    try {
      normalized = validateWorksheetH2Values(lessonSlug, input.h2Anchor, input.values);
    } catch (e) {
      if (e instanceof WorksheetValidationError) {
        await audit("worksheet.save_failed", {
          outcome: "invalid_keys",
          invalidKeys: e.invalidKeys,
        });
        return Result.err({
          kind: "invalid_keys",
          invalidKeys: e.invalidKeys,
        });
      }
      throw e;
    }

    const persisted = await this.deps.worksheetRepo.saveH2({
      studentId: input.studentId,
      lessonSlug,
      h2Anchor: input.h2Anchor,
      values: normalized,
    });
    if (!persisted.ok) {
      await audit("worksheet.save_failed", {
        outcome: persisted.error.kind,
        ...(persisted.error.kind === "invalid_keys"
          ? { invalidKeys: persisted.error.invalidKeys }
          : {}),
        ...(persisted.error.kind === "unknown_h2" ? { h2Anchor: persisted.error.h2Anchor } : {}),
        ...(persisted.error.kind === "db_error" ? { message: persisted.error.message } : {}),
      });
      return persisted;
    }

    await audit("worksheet.saved", {
      lessonSlug,
      h2Anchor: input.h2Anchor,
      fieldCount: Object.keys(normalized).length,
    });
    return Result.ok(undefined);
  }
}
