/**
 * IModuleRepository — port for persisting and querying course modules.
 *
 * STORY-048b. ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";
import type { Module } from "@/domain/entities/Module";

export type ModuleError =
  | { kind: "not_found" }
  | { kind: "db_error"; message: string };

export interface IModuleRepository {
  /**
   * List all modules for a course, sorted by displayOrder ascending.
   */
  findByCourseId(
    courseId: string,
  ): Promise<Result<readonly Module[], ModuleError>>;

  /**
   * Find a single module by its id.
   */
  findById(id: string): Promise<Result<Module, ModuleError>>;

  /**
   * Persist a new module. The caller is responsible for assigning
   * a valid `displayOrder` (the use case does this based on the
   * existing module count + 1).
   */
  create(module: Module): Promise<Result<Module, ModuleError>>;

  /**
   * Update an existing module. Returns `not_found` if the id doesn't
   * exist.
   */
  update(module: Module): Promise<Result<Module, ModuleError>>;

  /**
   * Delete a module by id. Returns `not_found` if the id doesn't
   * exist. The caller is responsible for reordering the remaining
   * modules (use `reorder()` to fix gaps).
   */
  delete(id: string): Promise<Result<void, ModuleError>>;

  /**
   * Atomically reorder a course's modules.
   *
   * The `moduleIds` array is the NEW order (1-indexed). The repository
   * updates the `displayOrder` of every module in the course to match
   * the array position. The implementation MUST validate that
   * `moduleIds` contains exactly the same set of ids as the current
   * modules for the course (no orphans, no extras).
   *
   * Returns the updated modules in the new order.
   */
  reorder(
    courseId: string,
    moduleIds: readonly string[],
  ): Promise<Result<readonly Module[], ModuleError>>;
}
