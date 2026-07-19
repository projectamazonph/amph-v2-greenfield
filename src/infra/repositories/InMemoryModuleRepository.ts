/**
 * InMemoryModuleRepository — fast in-memory adapter for IModuleRepository.
 *
 * STORY-048b. Used in tests + in prod (the prod container falls back
 * to the in-memory adapter for modules since there's no Prisma module
 * table yet — see the story's 'Prisma Module schema migration' out-of-scope
 * item).
 */

import { Result } from "@/domain/shared/Result";
import type { Module } from "@/domain/entities/Module";
import type {
  IModuleRepository,
  ModuleError,
} from "@/ports/repositories/IModuleRepository";

export class InMemoryModuleRepository implements IModuleRepository {
  private modules = new Map<string, Module>(); // key = module.id

  async findByCourseId(
    courseId: string,
  ): Promise<Result<readonly Module[], ModuleError>> {
    const filtered = Array.from(this.modules.values())
      .filter((m) => m.courseId === courseId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return Result.ok(filtered);
  }

  async findById(id: string): Promise<Result<Module, ModuleError>> {
    const m = this.modules.get(id);
    if (!m) return Result.err({ kind: "not_found" });
    return Result.ok(m);
  }

  async create(module: Module): Promise<Result<Module, ModuleError>> {
    this.modules.set(module.id, module);
    return Result.ok(module);
  }

  async update(module: Module): Promise<Result<Module, ModuleError>> {
    if (!this.modules.has(module.id)) {
      return Result.err({ kind: "not_found" });
    }
    this.modules.set(module.id, module);
    return Result.ok(module);
  }

  async delete(id: string): Promise<Result<void, ModuleError>> {
    if (!this.modules.has(id)) {
      return Result.err({ kind: "not_found" });
    }
    this.modules.delete(id);
    return Result.ok(undefined);
  }

  async reorder(
    courseId: string,
    moduleIds: readonly string[],
  ): Promise<Result<readonly Module[], ModuleError>> {
    // Validate: every module in the course must be in moduleIds, and
    // moduleIds must not contain any modules from a different course.
    const current = Array.from(this.modules.values()).filter(
      (m) => m.courseId === courseId,
    );
    const currentIds = new Set(current.map((m) => m.id));
    const inputIds = new Set(moduleIds);

    if (currentIds.size !== inputIds.size) {
      return Result.err({
        kind: "db_error",
        message: "reorder input does not match current modules",
      });
    }
    for (const id of currentIds) {
      if (!inputIds.has(id)) {
        return Result.err({
          kind: "db_error",
          message: `module ${id} missing from reorder input`,
        });
      }
    }
    for (const id of inputIds) {
      if (!currentIds.has(id)) {
        return Result.err({
          kind: "db_error",
          message: `module ${id} does not belong to course ${courseId}`,
        });
      }
    }

    // Apply the new order
    const updated: Module[] = [];
    moduleIds.forEach((id, index) => {
      const existing = this.modules.get(id);
      if (!existing) {
        return; // shouldn't happen given validation above
      }
      const next: Module = {
        ...existing,
        displayOrder: index + 1,
        updatedAt: new Date(),
      };
      this.modules.set(id, next);
      updated.push(next);
    });

    return Result.ok(updated);
  }

  /** Test helper. */
  clear(): void {
    this.modules.clear();
  }
}
