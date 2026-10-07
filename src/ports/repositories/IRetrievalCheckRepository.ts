/**
 * IRetrievalCheckRepository — port for the retrieval-check log (LEARN-040).
 *
 * Append-only: `record` inserts; there is no update path. Reads are
 * owner-scoped by userId. Implementations:
 * PrismaRetrievalCheckRepository (prod),
 * InMemoryRetrievalCheckRepository (tests).
 */

import type { Result } from "@/domain/shared/Result";
import type { RetrievalCheckAttempt } from "@/domain/entities/RetrievalCheckAttempt";

export type RetrievalCheckQueryError = { kind: "db_error"; message: string };

export interface IRetrievalCheckRepository {
  /**
   * Insert one attempt row. Postconditions: the row is retrievable
   * via listByUserAndLesson with identical fields.
   */
  record(
    attempt: RetrievalCheckAttempt,
  ): Promise<Result<RetrievalCheckAttempt, RetrievalCheckQueryError>>;

  /**
   * One student's attempts for one lesson, oldest first.
   * Soft-deleted rows are excluded.
   */
  listByUserAndLesson(
    userId: string,
    lessonSlug: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>>;

  /**
   * All of one student's attempts, newest first. Powers the
   * account-data export (LEARN-060). Soft-deleted rows excluded.
   */
  listByUser(
    userId: string,
  ): Promise<Result<readonly RetrievalCheckAttempt[], RetrievalCheckQueryError>>;
}
