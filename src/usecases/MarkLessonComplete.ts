/**
 * MarkLessonComplete — student marks a lesson as complete.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
 * STORY-028: Fires AwardXP (fire-and-forget) for lesson and course completion.
 *
 * Rules:
 *  1. Enrollment must exist for user + course → enrollment_not_found
 *  2. Enrollment must be active → enrollment_not_active
 *  3. Course must exist → course_not_found
 *  4. Lesson must be in course curriculum → lesson_not_in_course
 *  5. Call enrollment.markLessonComplete() — idempotent
 *  6. Persist updated enrollment
 *  7. Emit ProgressEvent (lesson_completed)
 *  8. If last lesson → also emit course_completed event
 *  9. Fire AwardXP for lesson (+10 XP) and course (+50 XP) — fire-and-forget
 */

import { Result } from "@/domain/shared/Result";
import { courseLessonCount } from "@/domain/entities/Course";
import { isCourseCompleted } from "@/domain/services/ProgressService";
import { XPService } from "@/domain/services/XPService";
import type { Enrollment } from "@/domain/entities/Enrollment";
import type { ProgressEvent } from "@/domain/entities/ProgressEvent";
import { createProgressEvent } from "@/domain/entities/ProgressEvent";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import { AwardXP } from "@/usecases/AwardXP";
import type { IXPEventRepository } from "@/ports/repositories/IXPEventRepository";
import type { UserRepository } from "@/ports/repositories/UserRepository";

export interface MarkLessonCompleteInput {
  userId: string;
  courseId: string;
  lessonId: string;
}

export interface MarkLessonCompleteDeps {
  enrollmentRepo: IEnrollmentRepository;
  courseRepo: CourseRepository;
  progressEventRepo: IProgressEventRepository;
  xpEventRepo: IXPEventRepository;
  userRepo: UserRepository;
  idGen: IdGenerator;
  clock: Clock;
}

export type MarkLessonCompleteError =
  | { kind: "enrollment_not_found" }
  | { kind: "enrollment_not_active" }
  | { kind: "course_not_found" }
  | { kind: "lesson_not_in_course" };

export type MarkLessonCompleteResult = Result<
  {
    enrollment: Enrollment;
    progressEvent: ProgressEvent;
    progressPercent: number;
  },
  MarkLessonCompleteError
>;

export class MarkLessonComplete {
  constructor(private readonly deps: MarkLessonCompleteDeps) {}

  async execute(input: MarkLessonCompleteInput): Promise<MarkLessonCompleteResult> {
    const { enrollmentRepo, courseRepo, progressEventRepo, idGen, clock } = this.deps;

    // ── 1. Find enrollment ─────────────────────────────────
    const enrollment = await enrollmentRepo.findByUserIdAndCourseId(
      input.userId,
      input.courseId,
    );
    if (enrollment === null) {
      return Result.err({ kind: "enrollment_not_found" });
    }

    // ── 2. Check enrollment is active ──────────────────────
    if (enrollment.status !== "active") {
      return Result.err({ kind: "enrollment_not_active" });
    }

    // ── 3. Find course ────────────────────────────────────
    const courseResult = await courseRepo.findById(input.courseId);
    if (!courseResult.ok) {
      return Result.err({ kind: "course_not_found" });
    }
    const course = courseResult.value;

    // ── 4. Check lesson is in curriculum ──────────────────
    const allLessonIds = course.curriculum.sections.flatMap((s) => s.lessons.map((l) => l.id));
    if (!allLessonIds.includes(input.lessonId)) {
      return Result.err({ kind: "lesson_not_in_course" });
    }

    const totalLessons = courseLessonCount(course);
    const wasCompleted = isCourseCompleted(enrollment.completedLessonIds, totalLessons);

    // ── 5. Mark lesson complete (idempotent) ───────────────
    enrollment.markLessonComplete(input.lessonId, totalLessons);

    // ── 6. Persist enrollment ─────────────────────────────
    const updateResult = await enrollmentRepo.update(enrollment);
    if (!updateResult.ok) {
      return Result.err({ kind: "enrollment_not_found" }); // surface as user error
    }
    const updatedEnrollment = updateResult.value;

    // ── 7. Emit lesson_completed event ────────────────────
    const lessonEventResult = this.createEvent({
      idGen,
      clock,
      userId: input.userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      type: "lesson_completed",
      metadata: { progressPercent: updatedEnrollment.progressPercent },
    });
    if (Result.isErr(lessonEventResult)) {
      return Result.err({ kind: "enrollment_not_found" });
    }
    const lessonEvent = lessonEventResult.value;

    // ── 7b. Persist lesson_completed event ─────────────────
    const createResult = await progressEventRepo.create(lessonEvent);
    if (!createResult.ok) {
      return Result.err({ kind: "enrollment_not_found" }); // surface as user error
    }

    // ── 8. If course just completed → award XP bonus (fire-and-forget) ──
    const nowCompleted = isCourseCompleted(updatedEnrollment.completedLessonIds, totalLessons);
    if (!wasCompleted && nowCompleted) {
      this.awardXp({
        userId: input.userId,
        amount: XPService.COURSE_COMPLETE_BONUS_XP,
        reason: "course_completed",
        refId: input.courseId,
      });
    }

    // ── 9. Award lesson completion XP (fire-and-forget) ───────────
    this.awardXp({
      userId: input.userId,
      amount: XPService.LESSON_XP,
      reason: "lesson_completed",
      refId: input.lessonId,
    });

    return Result.ok({
      enrollment: updatedEnrollment,
      progressEvent: lessonEvent,
      progressPercent: updatedEnrollment.progressPercent,
    });
  }

  private createEvent(params: {
    idGen: IdGenerator;
    clock: Clock;
    userId: string;
    courseId: string;
    lessonId: string;
    type: "lesson_completed" | "course_started" | "course_completed";
    metadata: Record<string, unknown>;
  }) {
    return createProgressEvent({
      id: params.idGen.newId(),
      userId: params.userId,
      courseId: params.courseId,
      lessonId: params.lessonId,
      type: params.type,
      metadata: params.metadata,
      createdAt: params.clock.now(),
    });
  }

  /** Fire-and-forget XP award. Errors are logged but don't affect the result. */
  private awardXp(params: {
    userId: string;
    amount: number;
    reason: "lesson_completed" | "course_completed" | "quiz_passed" | "streak_bonus";
    refId?: string;
  }): void {
    const awardXp = new AwardXP({
      xpEventRepo: this.deps.xpEventRepo,
      userRepo: this.deps.userRepo,
      idGen: this.deps.idGen,
      clock: this.deps.clock,
    });
    awardXp.execute(params).catch((err: unknown) => {
      console.error("[MarkLessonComplete] Failed to award XP:", err);
    });
  }
}
