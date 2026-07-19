/**
 * ILessonRepository — port for persisting and querying lessons.
 *
 * STORY-048c. Same shape as IModuleRepository; the difference is
 * scoped at the entity level (lessons have a `type` + `content`).
 */

import type { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";

export type LessonError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface ILessonRepository {
  /**
   * List all lessons for a module, sorted by displayOrder ascending.
   */
  findByModuleId(
    moduleId: string,
  ): Promise<Result<readonly Lesson[], LessonError>>;

  /**
   * Find a single lesson by its id.
   */
  findById(id: string): Promise<Result<Lesson, LessonError>>;

  /**
   * Persist a new lesson. The caller is responsible for assigning
   * a valid `displayOrder` (the use case does this based on the
   * existing lesson count + 1).
   */
  create(lesson: Lesson): Promise<Result<Lesson, LessonError>>;

  /**
   * Update an existing lesson. Returns `not_found` if the id doesn't
   * exist.
   */
  update(lesson: Lesson): Promise<Result<Lesson, LessonError>>;

  /**
   * Delete a lesson by id. Returns `not_found` if the id doesn't
   * exist. The caller is responsible for reordering the remaining
   * lessons (use `reorder()` to fix gaps).
   */
  delete(id: string): Promise<Result<void, LessonError>>;

  /**
   * Atomically reorder a module's lessons.
   *
   * Same contract as IModuleRepository.reorder: input must contain
   * exactly the current lessons for the module.
   */
  reorder(
    moduleId: string,
    lessonIds: readonly string[],
  ): Promise<Result<readonly Lesson[], LessonError>>;
}
