/**
 * RebuildCourseCurriculum — rebuild Course.curriculum from Module/Lesson.
 *
 * STORY-048b/c follow-up (docs/audit-2026-07-26-hardening-review.md).
 * Called by every module/lesson-mutating use case after a successful
 * write, so `Course.curriculum` never drifts from what the admin
 * actually edited. See `rebuildCurriculumFromModules` in
 * `src/domain/entities/Course.ts` for why this exists.
 *
 * CRITICAL: like RecordAuditLog, this use case never returns an error
 * to the caller — a rebuild failure must not fail (or roll back) the
 * module/lesson mutation that triggered it. Failures are logged and
 * swallowed, returning `{ rebuilt: false }`.
 */

import { rebuildCurriculumFromModules } from "@/domain/entities/Course";
import type { Lesson } from "@/domain/entities/Lesson";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IModuleRepository } from "@/ports/repositories/IModuleRepository";
import type { ILessonRepository } from "@/ports/repositories/ILessonRepository";
import type { Logger } from "@/ports/observability/Logger";

export interface RebuildCourseCurriculumDeps {
  courseRepo: CourseRepository;
  moduleRepo: IModuleRepository;
  lessonRepo: ILessonRepository;
  logger: Logger;
}

export interface RebuildCourseCurriculumResult {
  rebuilt: boolean;
}

export class RebuildCourseCurriculum {
  constructor(private readonly deps: RebuildCourseCurriculumDeps) {}

  async execute(courseId: string): Promise<RebuildCourseCurriculumResult> {
    const courseResult = await this.deps.courseRepo.findById(courseId);
    if (!courseResult.ok) {
      this.deps.logger.error("RebuildCourseCurriculum: course not found, skipping rebuild", {
        courseId,
        error: courseResult.error,
      });
      return { rebuilt: false };
    }

    const modulesResult = await this.deps.moduleRepo.findByCourseId(courseId);
    if (!modulesResult.ok) {
      this.deps.logger.error("RebuildCourseCurriculum: failed to load modules", {
        courseId,
        error: modulesResult.error,
      });
      return { rebuilt: false };
    }

    const lessonsByModuleId = new Map<string, readonly Lesson[]>();
    for (const mod of modulesResult.value) {
      const lessonsResult = await this.deps.lessonRepo.findByModuleId(mod.id);
      if (!lessonsResult.ok) {
        this.deps.logger.error("RebuildCourseCurriculum: failed to load lessons", {
          moduleId: mod.id,
          error: lessonsResult.error,
        });
        return { rebuilt: false };
      }
      lessonsByModuleId.set(mod.id, lessonsResult.value);
    }

    const curriculum = rebuildCurriculumFromModules(modulesResult.value, lessonsByModuleId);

    // Preserve every other field — only curriculum changes here. A
    // hand-spread that dropped a field (e.g. status) would silently
    // mutate it as a side effect of an unrelated curriculum rebuild.
    const updateResult = await this.deps.courseRepo.update({
      ...courseResult.value,
      curriculum,
    });
    if (!updateResult.ok) {
      this.deps.logger.error("RebuildCourseCurriculum: failed to persist rebuilt curriculum", {
        courseId,
        error: updateResult.error,
      });
      return { rebuilt: false };
    }

    return { rebuilt: true };
  }
}
