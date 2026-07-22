/**
 * PrismaModuleRepository, production adapter for IModuleRepository.
 *
 * STORY-048b / P0-2 follow-up: no Prisma model existed for Module, so
 * buildProductionContainer() fell back to InMemoryModuleRepository:
 * every module created through the admin curriculum editor vanished on
 * cold start / redeploy. Migration 20260722040000_module_lesson adds
 * the table.
 *
 * mapRow() reuses createModule() (the domain factory) to validate a
 * persisted row instead of duplicating its checks: a corrupt or legacy
 * row throws, which every caller's try/catch turns into db_error, same
 * pattern as PrismaSimulatorScenarioRepository.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { createModule } from "@/domain/entities/Module";
import type { Module } from "@/domain/entities/Module";
import type { IModuleRepository, ModuleError } from "@/ports/repositories/IModuleRepository";

interface ModuleRow {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function isNotFoundError(err: unknown): boolean {
  return (
    !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025"
  );
}

export class PrismaModuleRepository implements IModuleRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByCourseId(courseId: string): Promise<Result<readonly Module[], ModuleError>> {
    try {
      const rows = await this.db.module.findMany({
        where: { courseId },
        orderBy: { displayOrder: "asc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Module, ModuleError>> {
    try {
      const row = await this.db.module.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(module: Module): Promise<Result<Module, ModuleError>> {
    try {
      const row = await this.db.module.create({
        data: {
          id: module.id,
          courseId: module.courseId,
          title: module.title,
          displayOrder: module.displayOrder,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(module: Module): Promise<Result<Module, ModuleError>> {
    try {
      const row = await this.db.module.update({
        where: { id: module.id },
        data: {
          title: module.title,
          displayOrder: module.displayOrder,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(id: string): Promise<Result<void, ModuleError>> {
    try {
      await this.db.module.delete({ where: { id } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async reorder(
    courseId: string,
    moduleIds: readonly string[],
  ): Promise<Result<readonly Module[], ModuleError>> {
    try {
      const current = await this.db.module.findMany({ where: { courseId } });
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

      const rows = await this.db.$transaction(
        moduleIds.map((id, index) =>
          this.db.module.update({
            where: { id },
            data: { displayOrder: index + 1 },
          }),
        ),
      );
      return Result.ok(
        rows.map((r) => this.mapRow(r)).sort((a, b) => a.displayOrder - b.displayOrder),
      );
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  private mapRow(row: ModuleRow): Module {
    const result = createModule({
      id: row.id,
      courseId: row.courseId,
      title: row.title,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    if (!result.ok) {
      // Caught by the surrounding try/catch in every caller and turned
      // into a db_error. A corrupt or legacy row must not silently
      // hydrate an invalid Module.
      throw new Error(`Module ${row.id} failed validation on read: ${result.error.kind}`);
    }
    return result.value;
  }
}
