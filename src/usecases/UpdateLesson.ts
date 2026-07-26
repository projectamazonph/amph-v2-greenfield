/**
 * UpdateLesson — update a lesson.
 *
 * STORY-048c. The patch may change title, type, or content. If type
 * changes, the content is re-validated against the new type.
 */

import { Result } from "@/domain/shared/Result";
import { updateLesson, type Lesson, type UpdateLessonPatch } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { Clock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";

export interface UpdateLessonInput {
  lessonId: string;
  patch: UpdateLessonPatch;
  actorId: string;
}

export type UpdateLessonError =
  { kind: "lesson_not_found" } | { kind: "invalid_input"; message: string } | LessonError;

export type UpdateLessonResult = Result<{ lesson: Lesson }, UpdateLessonError>;

export interface UpdateLessonDeps {
  lessonRepo: ILessonRepository;
  moduleRepo: IModuleRepository;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
}

export class UpdateLesson {
  constructor(private readonly deps: UpdateLessonDeps) {}

  async execute(input: UpdateLessonInput): Promise<UpdateLessonResult> {
    const findResult = await this.deps.lessonRepo.findById(input.lessonId);
    if (!findResult.ok) {
      const error: UpdateLessonError =
        findResult.error.kind === "not_found" ? { kind: "lesson_not_found" } : findResult.error;
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.update_failed",
        targetId: input.lessonId,
        targetType: "lesson",
        metadata: { error: error.kind },
      });
      return Result.err(error);
    }
    const existing = findResult.value;

    const updateResult = updateLesson(existing, input.patch);
    if (!updateResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.update_failed",
        targetId: input.lessonId,
        targetType: "lesson",
        metadata: { error: updateResult.error.message },
      });
      return Result.err({ kind: "invalid_input", message: updateResult.error.message });
    }
    const withClock: Lesson = {
      ...updateResult.value,
      updatedAt: this.deps.clock.now(),
    };

    const persistResult = await this.deps.lessonRepo.update(withClock);
    if (!persistResult.ok) {
      const error: UpdateLessonError =
        persistResult.error.kind === "not_found"
          ? { kind: "lesson_not_found" }
          : persistResult.error;
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.update_failed",
        targetId: input.lessonId,
        targetType: "lesson",
        metadata: { error: error.kind },
      });
      return Result.err(error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "lesson.updated",
      targetId: input.lessonId,
      targetType: "lesson",
      // Log which fields changed, not the raw patch: `content` is
      // typed `unknown` and can carry an arbitrary-size video/quiz
      // payload, matching CreateLesson's success metadata (which also
      // excludes `content`).
      metadata: { patchedFields: Object.keys(input.patch) },
    });

    // title/type/content all feed directly into the curriculum's
    // corresponding lesson entry — resolve courseId via the module
    // and rebuild. Best-effort: a lookup failure must not fail the
    // lesson update itself.
    const moduleResult = await this.deps.moduleRepo.findById(existing.moduleId);
    if (moduleResult.ok) {
      await this.deps.rebuildCourseCurriculum.execute(moduleResult.value.courseId);
    }

    return Result.ok({ lesson: persistResult.value });
  }
}
