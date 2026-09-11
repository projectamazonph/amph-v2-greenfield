/**
 * SetCoursePrerequisite — admin gates a course behind another course
 * (P1-01, PR-C slice 1).
 *
 * Validates the rule in the domain (blank ids, self-require), confirms
 * both courses exist, confirms a lesson-scoped rule names a lesson in
 * the required course's curriculum, rejects dependency cycles, then
 * persists idempotently: an identical live rule is returned as-is.
 * Every outcome is audited (`prerequisite.set` / `prerequisite.set_failed`).
 *
 * Authorisation is delegated to the caller (`requireAdmin` in the
 * server action). The use case trusts the actor id it receives.
 */

import { Result } from "@/domain/shared/Result";
import {
  createPrerequisite,
  type CreatePrerequisiteError,
  type Prerequisite,
} from "@/domain/entities/Prerequisite";
import type { IPrerequisiteRepository } from "@/ports/repositories/IPrerequisiteRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";

export interface SetCoursePrerequisiteInput {
  actorId: string;
  courseId: string;
  requiresCourseId: string;
  requiresLessonId?: string | null;
}

export type SetCoursePrerequisiteError =
  | CreatePrerequisiteError
  | { kind: "course_not_found" }
  | { kind: "requires_course_not_found" }
  | { kind: "requires_lesson_not_found" }
  | { kind: "prerequisite_cycle" }
  | { kind: "db_error"; message: string };

export type SetCoursePrerequisiteResult = Result<
  Prerequisite,
  SetCoursePrerequisiteError
>;

export interface SetCoursePrerequisiteDeps {
  prerequisiteRepo: IPrerequisiteRepository;
  courseRepo: CourseRepository;
  idGen: IdGenerator;
  clock: Clock;
  recordAuditLog: RecordAuditLog;
}

export class SetCoursePrerequisite {
  constructor(private readonly deps: SetCoursePrerequisiteDeps) {}

  async execute(input: SetCoursePrerequisiteInput): Promise<SetCoursePrerequisiteResult> {
    const audit = (action: "prerequisite.set" | "prerequisite.set_failed", metadata: Record<string, unknown>) =>
      this.deps.recordAuditLog.execute({
        actorId: input.actorId,
        action,
        targetType: "prerequisite",
        targetId: `${input.courseId}->${input.requiresCourseId}`,
        metadata,
      });

    const built = createPrerequisite({
      id: this.deps.idGen.newId(),
      courseId: input.courseId,
      requiresCourseId: input.requiresCourseId,
      requiresLessonId: input.requiresLessonId ?? null,
      createdById: input.actorId,
      createdAt: this.deps.clock.now(),
    });
    if (!built.ok) {
      await audit("prerequisite.set_failed", {
        outcome: built.error.kind,
        courseId: input.courseId,
        requiresCourseId: input.requiresCourseId,
      });
      return Result.err(built.error);
    }

    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      await audit("prerequisite.set_failed", {
        outcome: "course_not_found",
        courseId: input.courseId,
      });
      return Result.err({ kind: "course_not_found" });
    }

    const requiredResult = await this.deps.courseRepo.findById(input.requiresCourseId);
    if (!requiredResult.ok) {
      await audit("prerequisite.set_failed", {
        outcome: "requires_course_not_found",
        requiresCourseId: input.requiresCourseId,
      });
      return Result.err({ kind: "requires_course_not_found" });
    }

    if (built.value.requiresLessonId !== null) {
      const lessonIds = requiredResult.value.curriculum.sections.flatMap((section) =>
        section.lessons.map((lesson) => lesson.id),
      );
      if (!lessonIds.includes(built.value.requiresLessonId)) {
        await audit("prerequisite.set_failed", {
          outcome: "requires_lesson_not_found",
          requiresLessonId: built.value.requiresLessonId,
        });
        return Result.err({ kind: "requires_lesson_not_found" });
      }
    }

    const cycle = await this.reachesCourse(input.requiresCourseId, input.courseId);
    if (!cycle.ok) {
      await audit("prerequisite.set_failed", {
        outcome: "db_error",
        message: cycle.error.message,
      });
      return Result.err({ kind: "db_error", message: cycle.error.message });
    }
    if (cycle.value) {
      await audit("prerequisite.set_failed", {
        outcome: "prerequisite_cycle",
        courseId: input.courseId,
        requiresCourseId: input.requiresCourseId,
      });
      return Result.err({ kind: "prerequisite_cycle" });
    }

    const existing = await this.deps.prerequisiteRepo.findRule(
      input.courseId,
      input.requiresCourseId,
      built.value.requiresLessonId,
    );
    if (!existing.ok) {
      await audit("prerequisite.set_failed", {
        outcome: "db_error",
        message: existing.error.message,
      });
      return Result.err({ kind: "db_error", message: existing.error.message });
    }
    if (existing.value !== null) {
      await audit("prerequisite.set", {
        outcome: "already_exists",
        ruleId: existing.value.id,
      });
      return Result.ok(existing.value);
    }

    const created = await this.deps.prerequisiteRepo.create(built.value);
    if (!created.ok) {
      await audit("prerequisite.set_failed", {
        outcome: "db_error",
        message: created.error.message,
      });
      return Result.err({ kind: "db_error", message: created.error.message });
    }

    await audit("prerequisite.set", {
      outcome: "success",
      ruleId: created.value.id,
      courseId: input.courseId,
      requiresCourseId: input.requiresCourseId,
      requiresLessonId: built.value.requiresLessonId,
    });
    return Result.ok(created.value);
  }

  /**
   * True when following prerequisite edges from `fromCourseId` reaches
   * `targetCourseId`. A new edge target->from would close that loop,
   * so reaching the target means the edge is a cycle.
   */
  private async reachesCourse(
    fromCourseId: string,
    targetCourseId: string,
  ): Promise<Result<boolean, { message: string }>> {
    const visited = new Set<string>();
    const queue = [fromCourseId];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === targetCourseId) return Result.ok(true);
      if (visited.has(current)) continue;
      visited.add(current);
      const listed = await this.deps.prerequisiteRepo.listByCourseId(current);
      if (!listed.ok) return Result.err({ message: listed.error.message });
      for (const rule of listed.value) {
        queue.push(rule.requiresCourseId);
      }
    }
    return Result.ok(false);
  }
}
