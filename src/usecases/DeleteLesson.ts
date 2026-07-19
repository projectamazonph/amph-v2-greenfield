/**
 * DeleteLesson — delete a lesson.
 *
 * STORY-048c. Same shape as DeleteModule.
 */

import { Result } from "@/domain/shared/Result";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";

export interface DeleteLessonInput {
  lessonId: string;
}

export type DeleteLessonError =
  | { kind: "lesson_not_found" }
  | LessonError;

export type DeleteLessonResult = Result<
  { deleted: true },
  DeleteLessonError
>;

export interface DeleteLessonDeps {
  lessonRepo: ILessonRepository;
}

export class DeleteLesson {
  constructor(private readonly deps: DeleteLessonDeps) {}

  async execute(input: DeleteLessonInput): Promise<DeleteLessonResult> {
    const r = await this.deps.lessonRepo.delete(input.lessonId);
    if (!r.ok) {
      if (r.error.kind === "not_found") {
        return Result.err({ kind: "lesson_not_found" });
      }
      return Result.err(r.error);
    }
    return Result.ok({ deleted: true });
  }
}
