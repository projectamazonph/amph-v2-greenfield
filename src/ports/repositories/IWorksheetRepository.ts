/**
 * IWorksheetRepository — port for persisting per-H2 worksheet entries.
 *
 * The worksheet entry is a normalized (one-row-per-field-value)
 * artifact: each row is keyed by (studentId, lessonSlug, h2Anchor,
 * fieldKey) and stores a single string value. The use cases wrap the
 * raw map in the domain WorksheetFieldValue shape; the adapter is
 * unaware of domain-level validation beyond the natural-key shape.
 *
 * Implementations: PrismaWorksheetRepository (prod),
 * InMemoryWorksheetRepository (tests + container.test.ts).
 *
 * ADR-014: every port method returns Result<T, E>. No exceptions
 * across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { WorksheetFieldValue, WorksheetLessonSlug } from "@/domain/artifacts/worksheetEntry";

export type WorksheetQueryError = { kind: "db_error"; message: string };

/**
 * Save error: invalid_keys means one of the keys in `values` is not in
 * the registered fieldKey set for the target H2. Use case layer maps
 * the domain WorksheetValidationError to this shape.
 */
export type WorksheetSaveError =
  | WorksheetQueryError
  | { kind: "invalid_keys"; invalidKeys: readonly string[] }
  | { kind: "unknown_h2"; h2Anchor: string };

export interface SaveH2Input {
  readonly studentId: string;
  readonly lessonSlug: WorksheetLessonSlug;
  readonly h2Anchor: string;
  /** Field-keyed map. Unknown keys surface as `invalid_keys`. */
  readonly values: Readonly<Record<string, string>>;
}

export interface IWorksheetRepository {
  /**
   * All worksheet field values for one student in one lesson.
   * Returned as a sparse list of per-field rows; the use case joins
   * them by (h2Anchor, fieldKey) for the renderer.
   *
   * Empty array when the student has not saved anything for the
   * lesson yet.
   */
  findByStudentAndLesson(
    studentId: string,
    lessonSlug: WorksheetLessonSlug,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>>;

  /**
   * Every field value for one student across all enrolled lessons.
   * Used by the dashboard aggregation; bulk read.
   */
  findByStudent(
    studentId: string,
  ): Promise<Result<readonly WorksheetFieldValue[], WorksheetQueryError>>;

  /**
   * Persist the full H2 (all field keys for that H2) in one call.
   * Each field becomes one row in the normalized table. Upsert on
   * (studentId, lessonSlug, h2Anchor, fieldKey). Missing keys fill in
   * with empty strings via the use case before reaching the port.
   *
   * Errors: `invalid_keys` — at least one key is not in the
   * registered fieldKey set for this H2.
   */
  saveH2(input: SaveH2Input): Promise<Result<void, WorksheetSaveError>>;
}
