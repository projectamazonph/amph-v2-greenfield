/**
 * DeleteLesson — delete a lesson.
 *
 * STORY-048c. Same shape as DeleteModule.
 */

import { Result } from "@/domain/shared/Result";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";

export interface DeleteLessonInput {
  lessonId: string;
  actorId: string;
}

export type DeleteLessonError = { kind: "lesson_not_found" } | LessonError;

export type DeleteLessonResult = Result<{ deleted: true }, DeleteLessonError>;

export interface DeleteLessonDeps {
  lessonRepo: ILessonRepository;
  moduleRepo: IModuleRepository;
  recordAuditLog: RecordAuditLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
}

export class DeleteLesson {
  constructor(private readonly deps: DeleteLessonDeps) {}

  async execute(input: DeleteLessonInput): Promise<DeleteLessonResult> {
    // Fetched before delete — moduleId (and, via that, courseId) is
    // needed to rebuild the curriculum afterward, and the row is gone
    // once delete() succeeds.
    const findResult = await this.deps.lessonRepo.findById(input.lessonId);
    if (!findResult.ok) {
      const error: DeleteLessonError =
        findResult.error.kind === "not_found" ? { kind: "lesson_not_found" } : findResult.error;
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.delete_failed",
        targetId: input.lessonId,
        targetType: "lesson",
        metadata: { error: error.kind },
      });
      return Result.err(error);
    }
    const moduleId = findResult.value.moduleId;

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

    const moduleResult = await this.deps.moduleRepo.findById(moduleId);
    if (moduleResult.ok) {
      await this.deps.rebuildCourseCurriculum.execute(moduleResult.value.courseId);
    }

    return Result.ok({ deleted: true });
  }
}
