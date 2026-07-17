/**
 * IQuizRepository — port for persisting and querying quizzes.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Quiz } from "@/domain/entities/Quiz";

export type QuizRepositoryError =
  | { kind: "db_error"; message: string };

export interface IQuizRepository {
  create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;
  findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>>;
  findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>>;
}
