/**
 * AdminGetLesson — fetch a lesson by id.
 *
 * STORY-048c. Thin wrapper.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";

export interface AdminGetLessonInput {
  lessonId: string;
}

export type AdminGetLessonError =
  | { kind: "lesson_not_found" }
  | LessonError;

export type AdminGetLessonResult = Result<
  { lesson: Lesson },
  AdminGetLessonError
>;

export interface AdminGetLessonDeps {
  lessonRepo: ILessonRepository;
}

export class AdminGetLesson {
  constructor(private readonly deps: AdminGetLessonDeps) {}

  async execute(input: AdminGetLessonInput): Promise<AdminGetLessonResult> {
    const r = await this.deps.lessonRepo.findById(input.lessonId);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        return Result.err({ kind: "lesson_not_found" });
      }
      return Result.err(r.error);
    }
    return Result.ok({ lesson: r.value });
  }
}
