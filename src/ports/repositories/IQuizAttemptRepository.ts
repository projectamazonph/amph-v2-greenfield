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
  | { kind: "db_error"; message: string };

export interface IQuizAttemptRepository {
  create(attempt: QuizAttempt): Promise<Result<QuizAttempt, QuizAttemptRepositoryError>>;
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
