/**
 * AdminListLessons — list lessons for a module.
 *
 * STORY-048c. Thin wrapper.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";

export interface AdminListLessonsInput {
  moduleId: string;
}

export type AdminListLessonsResult = Result<
  { lessons: readonly Lesson[] },
  LessonError
>;

export interface AdminListLessonsDeps {
  lessonRepo: ILessonRepository;
}

export class AdminListLessons {
  constructor(private readonly deps: AdminListLessonsDeps) {}

  async execute(
    input: AdminListLessonsInput,
  ): Promise<AdminListLessonsResult> {
    const r = await this.deps.lessonRepo.findByModuleId(input.moduleId);
    if (!r.ok) return Result.err(r.error);
    return Result.ok({ lessons: r.value });
  }
}
