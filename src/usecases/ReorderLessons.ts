/**
 * ReorderLessons — atomically reorder a module's lessons.
 *
 * STORY-048c. Same shape as ReorderModules.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";

export interface ReorderLessonsInput {
  moduleId: string;
  lessonIds: readonly string[];
  actorId: string;
}

export type ReorderLessonsResult = Result<{ lessons: readonly Lesson[] }, LessonError>;

export interface ReorderLessonsDeps {
  lessonRepo: ILessonRepository;
  moduleRepo: IModuleRepository;
  recordAuditLog: RecordAuditLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
}

export class ReorderLessons {
  constructor(private readonly deps: ReorderLessonsDeps) {}

  async execute(input: ReorderLessonsInput): Promise<ReorderLessonsResult> {
    const r = await this.deps.lessonRepo.reorder(input.moduleId, input.lessonIds);
    if (!r.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.reorder_failed",
        targetId: input.moduleId,
        targetType: "lesson",
        metadata: { error: r.error.kind },
      });
      return Result.err(r.error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "lesson.reordered",
      targetId: input.moduleId,
      targetType: "lesson",
      metadata: { lessonIds: input.lessonIds },
    });

    const moduleResult = await this.deps.moduleRepo.findById(input.moduleId);
    if (moduleResult.ok) {
      await this.deps.rebuildCourseCurriculum.execute(moduleResult.value.courseId);
    }

    return Result.ok({ lessons: r.value });
  }
}
