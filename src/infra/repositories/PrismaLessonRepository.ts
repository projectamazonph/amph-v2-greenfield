/**
 * PrismaLessonRepository, production adapter for ILessonRepository.
 *
 * STORY-048c / P0-2 follow-up: no Prisma model existed for Lesson, so
 * buildProductionContainer() fell back to InMemoryLessonRepository:
 * every lesson created through the admin curriculum editor vanished on
 * cold start / redeploy. Migration 20260722040000_module_lesson adds
 * the table.
 *
 * mapRow() reuses createLesson() (the domain factory) to validate a
 * persisted row instead of duplicating its type/content checks: a
 * corrupt or legacy row throws, which every caller's try/catch turns
 * into db_error, same pattern as PrismaSimulatorScenarioRepository.
 */

import { PrismaClient, Prisma } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import { createLesson } from "@/domain/entities/Lesson";
import type { Lesson, LessonType } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";

interface LessonRow {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  content: Prisma.JsonValue;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

function isNotFoundError(err: unknown): boolean {
  return (
    !!err && typeof err === "object" && "code" in err && (err as { code: string }).code === "P2025"
  );
}

export class PrismaLessonRepository implements ILessonRepository {
  constructor(private readonly db: PrismaClient) {}

  async findByModuleId(moduleId: string): Promise<Result<readonly Lesson[], LessonError>> {
    try {
      const rows = await this.db.lesson.findMany({
        where: { moduleId },
        orderBy: { displayOrder: "asc" },
      });
      return Result.ok(rows.map((r) => this.mapRow(r)));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async findById(id: string): Promise<Result<Lesson, LessonError>> {
    try {
      const row = await this.db.lesson.findUnique({ where: { id } });
      if (!row) return Result.err({ kind: "not_found" });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async create(lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    try {
      const row = await this.db.lesson.create({
        data: {
          id: lesson.id,
          moduleId: lesson.moduleId,
          title: lesson.title,
          type: lesson.type,
          content: lesson.content as unknown as Prisma.InputJsonValue,
          displayOrder: lesson.displayOrder,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async update(lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    try {
      const row = await this.db.lesson.update({
        where: { id: lesson.id },
        data: {
          title: lesson.title,
          type: lesson.type,
          content: lesson.content as unknown as Prisma.InputJsonValue,
          displayOrder: lesson.displayOrder,
        },
      });
      return Result.ok(this.mapRow(row));
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async delete(id: string): Promise<Result<void, LessonError>> {
    try {
      await this.db.lesson.delete({ where: { id } });
      return Result.ok(undefined);
    } catch (err: unknown) {
      if (isNotFoundError(err)) return Result.err({ kind: "not_found" });
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async reorder(
    moduleId: string,
    lessonIds: readonly string[],
  ): Promise<Result<readonly Lesson[], LessonError>> {
    try {
      const current = await this.db.lesson.findMany({ where: { moduleId } });
      const currentIds = new Set(current.map((l) => l.id));
      const inputIds = new Set(lessonIds);

      if (currentIds.size !== inputIds.size) {
        return Result.err({
          kind: "db_error",
          message: "reorder input does not match current lessons",
        });
      }
      for (const id of currentIds) {
        if (!inputIds.has(id)) {
          return Result.err({
            kind: "db_error",
            message: `lesson ${id} missing from reorder input`,
          });
        }
      }
      for (const id of inputIds) {
        if (!currentIds.has(id)) {
          return Result.err({
            kind: "db_error",
            message: `lesson ${id} does not belong to module ${moduleId}`,
          });
        }
      }

      const rows = await this.db.$transaction(
        lessonIds.map((id, index) =>
          this.db.lesson.update({
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

  private mapRow(row: LessonRow): Lesson {
    const result = createLesson({
      id: row.id,
      moduleId: row.moduleId,
      title: row.title,
      type: row.type as LessonType,
      content: row.content,
      displayOrder: row.displayOrder,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    });
    if (!result.ok) {
      // Caught by the surrounding try/catch in every caller and turned
      // into a db_error. A corrupt or legacy row must not silently
      // hydrate an invalid Lesson.
      throw new Error(`Lesson ${row.id} failed validation on read: ${result.error.kind}`);
    }
    return result.value;
  }
}
