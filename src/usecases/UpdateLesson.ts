/**
 * UpdateLesson — update a lesson.
 *
 * STORY-048c. The patch may change title, type, or content. If type
 * changes, the content is re-validated against the new type.
 */

import { Result } from "@/domain/shared/Result";
import { updateLesson, type Lesson, type UpdateLessonPatch } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { Clock } from "@/ports/system/Clock";

export interface UpdateLessonInput {
  lessonId: string;
  patch: UpdateLessonPatch;
}

export type UpdateLessonError =
  | { kind: "lesson_not_found" }
  | { kind: "invalid_input"; message: string }
  | LessonError;

export type UpdateLessonResult = Result<
  { lesson: Lesson },
  UpdateLessonError
>;

export interface UpdateLessonDeps {
  lessonRepo: ILessonRepository;
  clock: Clock;
}

export class UpdateLesson {
  constructor(private readonly deps: UpdateLessonDeps) {}

  async execute(input: UpdateLessonInput): Promise<UpdateLessonResult> {
    const findResult = await this.deps.lessonRepo.findById(input.lessonId);
    if (!findResult.ok) {
      if (findResult.error.kind === "not_found") {
        return Result.err({ kind: "lesson_not_found" });
      }
      return Result.err(findResult.error);
    }
    const existing = findResult.value;

    const updateResult = updateLesson(existing, input.patch);
    if (!updateResult.ok) {
      return Result.err({ kind: "invalid_input", message: updateResult.error.message });
    }
    const withClock: Lesson = {
      ...updateResult.value,
      updatedAt: this.deps.clock.now(),
    };

    const persistResult = await this.deps.lessonRepo.update(withClock);
    if (!persistResult.ok) {
      if (persistResult.error.kind === "not_found") {
        return Result.err({ kind: "lesson_not_found" });
      }
      return Result.err(persistResult.error);
    }
    return Result.ok({ lesson: persistResult.value });
  }
}
