/**
 * IQuizAttemptRepository — port for persisting and querying quiz attempts.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { QuizAttempt } from "@/domain/entities/QuizAttempt";

export type QuizAttemptRepositoryError =
  { kind: "db_error"; message: string } | { kind: "not_found" } | { kind: "already_exists" };

export interface IQuizAttemptRepository {
  /**
   * Create a new attempt. MUST return `already_exists` if the id
   * already exists in the store.
   */
  create(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>;

  /**
   * Update an existing attempt. MUST return `not_found` if no row
   * with the given id exists. Use case code that wants to upsert
   * should call `findById` first, or use a separate `create` path
   * for the new-attempt case.
   *
   * P0-6 fix: the in-memory and Prisma adapters previously diverged
   * (InMemory upserted, Prisma required the row to exist). The
   * contract is now explicit: `update` is NOT an upsert.
   */
  update(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>;

  /**
   * Find a quiz attempt by its unique ID.
   *
   * @param id - Attempt UUID
   * @returns The attempt, or null if no attempt exists with this ID
   *
   * Errors: `db_error` — database failure.
   * Idempotent: Yes — reading does not mutate state.
   * Postconditions: Returns the attempt in its current state (may be in_progress or graded).
   */
  findById(id: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;

  /**
   * Find all attempts by a specific user for a specific quiz.
   * Used to display attempt history and enforce attempt limits.
   *
   * @param userId - User UUID
   * @param quizId - Quiz UUID
   * @returns Array of attempts, ordered by creation time (newest first)
   *
   * Errors: `db_error` — database failure.
   * Idempotent: Yes — reading does not mutate state.
   * Postconditions: Returns empty array if no attempts exist for this user+quiz.
   */
  findByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<readonly QuizAttempt[], QuizAttemptRepositoryError>>;

  /**
   * Find the most recent attempt by a specific user for a specific quiz.
   * Used to check if the user has an in-progress attempt or to display
   * the latest score.
   *
   * @param userId - User UUID
   * @param quizId - Quiz UUID
   * @returns The most recent attempt, or null if no attempts exist
   *
   * Errors: `db_error` — database failure.
   * Idempotent: Yes — reading does not mutate state.
   * Postconditions: Returns the attempt with the latest `createdAt` timestamp.
   */
  findLatestByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;
  /**
   * Count how many attempts exist for a given quiz. Used by the
   * admin quiz-delete guard (`AdminDeleteQuiz`) to block deletion
   * when attempts exist, since `QuizAttempt.quizId` has no FK
   * relation (STORY-091 Architecture Note 4).
   */
  countByQuizId(quizId: string): Promise<Result<number, QuizAttemptRepositoryError>>;
}
