/**
 * ReorderLessons — atomically reorder a module's lessons.
 *
 * STORY-048c. Same shape as ReorderModules.
 */

import { Result } from "@/domain/shared/Result";
import type { Lesson } from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface ReorderLessonsInput {
  moduleId: string;
  lessonIds: readonly string[];
  actorId: string;
}

export type ReorderLessonsResult = Result<{ lessons: readonly Lesson[] }, LessonError>;

export interface ReorderLessonsDeps {
  lessonRepo: ILessonRepository;
  recordAuditLog: RecordAuditLog;
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

    return Result.ok({ lessons: r.value });
  }
}
