/**
 * WorksheetRepository port. STORY-163.
 *
 * Stores the per-student, per-lesson rows for the Module 1
 * Profitability and Max-CPC Sheet. There is one row per
 * (studentId, lessonSlug); the row carries 34 nullable string columns
 * for the field values. Reads return all rows the student has touched;
 * writes upsert one row.
 *
 * The React side calls SaveWorksheetEntryUseCase on blur with the full
 * row of values, so this port has no per-field write method.
 *
 * ADR-014: every method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type {
  WorksheetEntry,
  WorksheetLessonSlug,
  WorksheetValues,
} from "@/domain/artifacts/worksheetEntry";

export type WorksheetError = { kind: "db_error"; message: string };

export interface UpsertWorksheetArgs {
  studentId: string;
  lessonSlug: WorksheetLessonSlug;
  values: WorksheetValues;
  /** Who is doing the write (always the student themselves in v1). */
  actorId: string;
  updatedAt: Date;
}

export interface WorksheetRepository {
  /**
   * Load every row for a student. Result is empty if the student has
   * not yet opened any lesson. Order is unspecified; callers that need
   * a specific order should sort by lessonSlug themselves (it is the
   * natural primary-key prefix).
   */
  findByStudent(studentId: string): Promise<Result<readonly WorksheetEntry[], WorksheetError>>;

  /**
   * Create or update the row for (studentId, lessonSlug). The full row
   * is the unit of write; partial updates are not supported. Soft-deletes
   * via deletedAt per AGENTS.md "Every mutable Prisma model needs
   * deletedAt" — a future STORY can add an explicit archive path.
   */
  upsert(args: UpsertWorksheetArgs): Promise<Result<{ savedAt: Date }, WorksheetError>>;
}
