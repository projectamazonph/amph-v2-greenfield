/**
 * IProgressEventRepository — port for persisting and querying progress events.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { ProgressEvent } from "@/domain/entities/ProgressEvent";

export type ProgressEventError =
  | { kind: "db_error"; message: string };

export interface IProgressEventRepository {
  /**
   * Persist a new progress event.
   */
  create(event: ProgressEvent): Promise<Result<ProgressEvent, ProgressEventError>>;

  /**
   * Find all progress events for a user, ordered by createdAt descending.
   */
  findByUserId(userId: string): Promise<Result<readonly ProgressEvent[], ProgressEventError>>;

  /**
   * Find all progress events for a course, ordered by createdAt descending.
   */
  findByCourseId(courseId: string): Promise<Result<readonly ProgressEvent[], ProgressEventError>>;
}
