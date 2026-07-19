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
  | { kind: "db_error"; message: string }
  | { kind: "not_found" }
  | { kind: "already_exists" };

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
  findById(id: string): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;
  findByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<readonly QuizAttempt[], QuizAttemptRepositoryError>>;
  findLatestByUserAndQuiz(
    userId: string,
    quizId: string,
  ): Promise<Result<QuizAttempt | null, QuizAttemptRepositoryError>>;
}
