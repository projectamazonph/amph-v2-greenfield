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
  /**
   * Persist a new quiz. The quiz must have a valid courseId.
   *
   * @param quiz - Quiz entity to persist
   * @returns The persisted quiz with its generated ID
   *
   * Errors: `db_error` — database failure.
   * Idempotent: No — calling twice creates two quizzes.
   * Postconditions: Quiz is persisted and retrievable via findById/findByCourseId.
   */
  create(quiz: Quiz): Promise<Result<Quiz, QuizRepositoryError>>;

  /**
   * Find a quiz by its unique ID.
   *
   * @param id - Quiz UUID
   * @returns The quiz, or null if no quiz exists with this ID
   *
   * Errors: `db_error` — database failure.
   * Idempotent: Yes — reading does not mutate state.
   * Postconditions: Returns the quiz with all questions and options loaded.
   */
  findById(id: string): Promise<Result<Quiz | null, QuizRepositoryError>>;

  /**
   * Find all quizzes for a specific course. Used by the course detail
   * page to list available knowledge checks.
   *
   * @param courseId - Course UUID
   * @returns Array of quizzes, ordered by creation time
   *
   * Errors: `db_error` — database failure.
   * Idempotent: Yes — reading does not mutate state.
   * Postconditions: Returns empty array if no quizzes exist for this course.
   */
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
