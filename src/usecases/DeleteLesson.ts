/**
 * DeleteLesson — delete a lesson.
 *
 * STORY-048c. Same shape as DeleteModule.
 */

import { Result } from "@/domain/shared/Result";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface DeleteLessonInput {
  lessonId: string;
  actorId: string;
}

export type DeleteLessonError = { kind: "lesson_not_found" } | LessonError;

export type DeleteLessonResult = Result<{ deleted: true }, DeleteLessonError>;

export interface DeleteLessonDeps {
  lessonRepo: ILessonRepository;
  recordAuditLog: RecordAuditLog;
}

export class DeleteLesson {
  constructor(private readonly deps: DeleteLessonDeps) {}

  async execute(input: DeleteLessonInput): Promise<DeleteLessonResult> {
    const r = await this.deps.lessonRepo.delete(input.lessonId);
    if (!r.ok) {
      const error: DeleteLessonError =
        r.error.kind === "not_found" ? { kind: "lesson_not_found" } : r.error;
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.delete_failed",
        targetId: input.lessonId,
        targetType: "lesson",
        metadata: { error: error.kind },
      });
      return Result.err(error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "lesson.deleted",
      targetId: input.lessonId,
      targetType: "lesson",
      metadata: {},
    });

    return Result.ok({ deleted: true });
  }
}
