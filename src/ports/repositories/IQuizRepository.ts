/**
 * IQuizRepository — port for persisting and querying quizzes.
 *
 * STORY-031: Quiz + QuizAttempt models + repositories.
 * STORY-091: Admin quiz CRUD — added update, delete, findAll.
 *
 * ADR-014: Every port method returns Result<T, E>. No exceptions across boundaries.
 */

import type { Result } from "@/domain/shared/Result";
import type { Quiz } from "@/domain/entities/Quiz";

export type QuizRepositoryError = { kind: "not_found" } | { kind: "db_error"; message: string };

export interface IQuizRepository {
  create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;
  findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>>;
  findByCourseId(courseId: string): Promise<Result<readonly Quiz[], QuizRepositoryError>>;
  /**
   * Return every quiz in the system. Intended for the admin
   * listing surface; the per-course `findByCourseId` is preferred
   * for student-facing reads (cheaper, scoped).
   */
  findAll(): Promise<Result<readonly Quiz[], QuizRepositoryError>>;
  /**
   * Replace an existing quiz's title/passingScore/questions/options
   * by id. Returns the updated quiz, or `not_found` if no quiz
   * exists with that id.
   */
  update(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;
  /**
   * Remove a quiz by id. Children (questions, options) cascade
   * via the Prisma schema (`onDelete: Cascade`); the InMemory
   * adapter enforces the same invariant by clearing children on
   * delete. Returns `not_found` if the id doesn't exist.
   */
  delete(id: string): Promise<Result<void, QuizRepositoryError>>;
}
