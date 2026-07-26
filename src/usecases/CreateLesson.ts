/**
 * CreateLesson — create a new lesson in a module.
 *
 * STORY-048c. Auto-assigns displayOrder = count + 1.
 */

import { Result } from "@/domain/shared/Result";
import {
  createLesson,
  type Lesson,
  type LessonType,
  type LessonContent,
} from "@/domain/entities/Lesson";
import type { ILessonRepository, LessonError } from "@/ports/repositories/ILessonRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RebuildCourseCurriculum } from "@/usecases/RebuildCourseCurriculum";

export interface CreateLessonInput {
  moduleId: string;
  title: string;
  type: LessonType;
  content: LessonContent;
  actorId: string;
}

export type CreateLessonError = { kind: "invalid_input"; message: string } | LessonError;

export type CreateLessonResult = Result<{ lesson: Lesson }, CreateLessonError>;

export interface CreateLessonDeps {
  lessonRepo: ILessonRepository;
  moduleRepo: IModuleRepository;
  idGen: IdGenerator;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
  rebuildCourseCurriculum: RebuildCourseCurriculum;
}

export class CreateLesson {
  constructor(private readonly deps: CreateLessonDeps) {}

  async execute(input: CreateLessonInput): Promise<CreateLessonResult> {
    if (!input.title.trim()) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.create_failed",
        targetId: input.moduleId,
        targetType: "lesson",
        metadata: { error: "title is required" },
      });
      return Result.err({ kind: "invalid_input", message: "title is required" });
    }

    const existing = await this.deps.lessonRepo.findByModuleId(input.moduleId);
    if (!existing.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.create_failed",
        targetId: input.moduleId,
        targetType: "lesson",
        metadata: { error: existing.error.kind },
      });
      return Result.err(existing.error);
    }
    const nextOrder = existing.value.length + 1;

    const id = this.deps.idGen.newId();
    const now = this.deps.clock.now();
    const buildResult = createLesson({
      id,
      moduleId: input.moduleId,
      title: input.title,
      type: input.type,
      content: input.content,
      displayOrder: nextOrder,
      createdAt: now,
      updatedAt: now,
    });
    if (!buildResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.create_failed",
        targetId: id,
        targetType: "lesson",
        metadata: { error: buildResult.error.message },
      });
      return Result.err({ kind: "invalid_input", message: buildResult.error.message });
    }
    const lesson = buildResult.value;

    const persistResult = await this.deps.lessonRepo.create(lesson);
    if (!persistResult.ok) {
      void this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action: "lesson.create_failed",
        targetId: id,
        targetType: "lesson",
        metadata: { error: persistResult.error.kind },
      });
      return Result.err(persistResult.error);
    }

    void this.deps.recordAuditLog.execute({
      actorId: input.actorId,
      action: "lesson.created",
      targetId: persistResult.value.id,
      targetType: "lesson",
      metadata: { moduleId: input.moduleId, title: input.title, type: input.type },
    });

    // Lesson has no courseId of its own — resolve it via the module,
    // then keep Course.curriculum in sync. Best-effort: a lookup
    // failure here must not fail the lesson creation itself.
    const moduleResult = await this.deps.moduleRepo.findById(input.moduleId);
    if (moduleResult.ok) {
      await this.deps.rebuildCourseCurriculum.execute(moduleResult.value.courseId);
    }

    return Result.ok({ lesson: persistResult.value });
  }
}
