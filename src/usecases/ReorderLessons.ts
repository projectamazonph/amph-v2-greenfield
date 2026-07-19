/**
 * ReorderLessons — atomically reorder a module's lessons.
 *
 * STORY-048c. Same shape as ReorderModules.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";

export interface ReorderLessonsInput {
  moduleId: string;
  lessonIds: readonly string[];
}

export type ReorderLessonsResult = Result<
  { lessons: readonly Lesson[] },
  LessonError
>;

export interface ReorderLessonsDeps {
  lessonRepo: ILessonRepository;
}

export class ReorderLessons {
  constructor(private readonly deps: ReorderLessonsDeps) {}

  async execute(input: ReorderLessonsInput): Promise<ReorderLessonsResult> {
    const r = await this.deps.lessonRepo.reorder(input.moduleId, input.lessonIds);
    if (!r.ok) return Result.err(r.error);
    return Result.ok({ lessons: r.value });
  }
}
