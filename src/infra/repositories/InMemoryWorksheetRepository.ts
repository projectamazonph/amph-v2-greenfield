/**
 * InMemoryWorksheetRepository — test double for IWorksheetRepository.
 *
 * Map keyed by `${studentId}::${lessonSlug}::${h2Anchor}::${fieldKey}`
 * → WorksheetFieldValue. The four-segment key matches the production
 * composite unique index in the Prisma schema.
 *
 * Soft-delete is not simulated: live rows only, matching how the
 * rest of the InMemory fakes treat their tables.
 */

import { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue } from "@/domain/artifacts/worksheetEntry";
import type {
  IWorksheetRepository,
  SaveH2Input,
  WorksheetQueryError,
  WorksheetSaveError,
} from "@/ports/repositories/IWorksheetRepository";

export class InMemoryWorksheetRepository implements IWorksheetRepository {
  private readonly rows = new Map<string, WorksheetFieldValue>();

  /** Internal: assemble the four-segment composite key. */
  private static key(
    studentId: string,
    lessonSlug: string,
    h2Anchor: string,
    fieldKey: string,
  ): string {
    return `${studentId}::${lessonSlug}::${h2Anchor}::${fieldKey}`;
  }

  async findByStudentAndLesson(
    studentId: string,
    lessonSlug: string,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>> {
    const out: WorksheetFieldValue[] = [];
    for (const [k, row] of this.rows.entries()) {
      const [sid, slug] = k.split("::");
      if (sid === studentId && slug === lessonSlug) {
        out.push(row);
      }
    }
    return Result.ok(out);
  }

  async findByStudent(
    studentId: string,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>> {
    const out: WorksheetFieldValue[] = [];
    for (const [k, row] of this.rows.entries()) {
      const [sid] = k.split("::");
      if (sid === studentId) out.push(row);
    }
    return Result.ok(out);
  }

  async saveH2(input: SaveH2Input): Promise<Result<void, WorksheetSaveError>> {
    const now = new Date();
    for (const [fieldKey, value] of Object.entries(input.values)) {
      const k = InMemoryWorksheetRepository.key(
        input.studentId,
        input.lessonSlug,
        input.h2Anchor,
        fieldKey,
      );
      this.rows.set(k, {
        studentId: input.studentId,
        lessonSlug: input.lessonSlug,
        h2Anchor: input.h2Anchor,
        fieldKey,
        value,
        updatedAt: now,
      });
    }
    return Result.ok(undefined);
  }
}
