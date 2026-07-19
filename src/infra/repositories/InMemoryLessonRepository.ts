/**
 * InMemoryLessonRepository — fast in-memory adapter for ILessonRepository.
 *
 * STORY-048c. Same shape as InMemoryModuleRepository.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type {
  ILessonRepository,
  LessonError,
} from "@/ports/repositories/ILessonRepository";

export class InMemoryLessonRepository implements ILessonRepository {
  private lessons = new Map<string, Lesson>(); // key = lesson.id

  async findByModuleId(
    moduleId: string,
  ): Promise<Result<readonly Lesson[], LessonError>> {
    const filtered = Array.from(this.lessons.values())
      .filter((l) => l.moduleId === moduleId)
      .sort((a, b) => a.displayOrder - b.displayOrder);
    return Result.ok(filtered);
  }

  async findById(id: string): Promise<Result<Lesson, LessonError>> {
    const l = this.lessons.get(id);
    if (!l) return Result.err({ kind: "not_found" });
    return Result.ok(l);
  }

  async create(lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    this.lessons.set(lesson.id, lesson);
    return Result.ok(lesson);
  }

  async update(lesson: Lesson): Promise<Result<Lesson, LessonError>> {
    if (!this.lessons.has(lesson.id)) {
      return Result.err({ kind: "not_found" });
    }
    this.lessons.set(lesson.id, lesson);
    return Result.ok(lesson);
  }

  async delete(id: string): Promise<Result<void, LessonError>> {
    if (!this.lessons.has(id)) {
      return Result.err({ kind: "not_found" });
    }
    this.lessons.delete(id);
    return Result.ok(undefined);
  }

  async reorder(
    moduleId: string,
    lessonIds: readonly string[],
  ): Promise<Result<readonly Lesson[], LessonError>> {
    const current = Array.from(this.lessons.values()).filter(
      (l) => l.moduleId === moduleId,
    );
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

    const updated: Lesson[] = [];
    lessonIds.forEach((id, index) => {
      const existing = this.lessons.get(id);
      if (!existing) return;
      const next: Lesson = {
        ...existing,
        displayOrder: index + 1,
        updatedAt: new Date(),
      };
      this.lessons.set(id, next);
      updated.push(next);
    });

    return Result.ok(updated);
  }

  /** Test helper. */
  clear(): void {
    this.lessons.clear();
  }
}
