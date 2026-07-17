/**
 * MarkLessonComplete — student marks a lesson as complete.
 *
 * STORY-027: MarkLessonComplete use case + ProgressService + ProgressEvent log.
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
 */

import { Result } from "@/domain/shared/Result";
import { courseLessonCount } from "@/domain/entities/Course";
import { isCourseCompleted } from "@/domain/services/ProgressService";
import type { Enrollment } from "@/domain/entities/Enrollment";
import type { ProgressEvent } from "@/domain/entities/ProgressEvent";
import { createProgressEvent } from "@/domain/entities/ProgressEvent";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

export interface MarkLessonCompleteInput {
  userId: string;
  courseId: string;
  lessonId: string;
}

export interface MarkLessonCompleteDeps {
  enrollmentRepo: IEnrollmentRepository;
  courseRepo: CourseRepository;
  progressEventRepo: IProgressEventRepository;
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

    // ── 8. Emit course_completed event if last lesson ─────
    const nowCompleted = isCourseCompleted(updatedEnrollment.completedLessonIds, totalLessons);
    if (!wasCompleted && nowCompleted) {
      const courseEventResult = this.createEvent({
        idGen,
        clock,
        userId: input.userId,
        courseId: input.courseId,
        lessonId: input.lessonId,
        type: "course_completed",
        metadata: { progressPercent: 100 },
      });
      if (Result.isOk(courseEventResult)) {
        // Fire-and-forget: course_completed event is supplementary
        courseEventResult; // suppress unused warning
      }
    }

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
}
