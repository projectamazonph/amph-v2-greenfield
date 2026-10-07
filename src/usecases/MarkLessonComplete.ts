import { courseLessonCount } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { createProgressEvent, type ProgressEvent } from "@/domain/entities/ProgressEvent";
import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { RecordAuditLog } from "@/usecases/RecordAuditLog";
import type { IssueCertificate } from "@/usecases/IssueCertificate";
import { orderLearnerModules, prerequisiteForLesson } from "@/domain/curriculum/GuidedFlow";

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
  /**
   * Optional. When provided, MarkLessonComplete fires IssueCertificate
   * exactly once when the lesson that just completed is the final one
   * (i.e. progressPercent just reached 100). The completion is non-fatal
   * for the lesson itself: a certificate-issuance failure is logged and
   * the lesson still returns success, because the user-visible event is
   * "you finished this lesson" and the certificate is a side effect.
   * Optional so existing tests that don't care about certificates keep
   * building the use case without the extra wiring.
   */
  issueCertificate?: IssueCertificate;
  /**
   * Optional. When provided alongside `issueCertificate`, every
   * successful issuance writes an audit row carrying the certificate id,
   * the actor "system", and the course id so the trail distinguishes
   * the auto-issued case from any future admin re-issue.
   */
  recordAuditLog?: RecordAuditLog;
}

export type MarkLessonCompleteError =
  | { kind: "enrollment_not_found" }
  | { kind: "enrollment_not_active" }
  | { kind: "course_not_found" }
  | { kind: "lesson_not_in_course" }
  | { kind: "prerequisite_locked"; previousLessonId: string }
  | { kind: "db_error" };

export interface MarkLessonCompleteValue {
  enrollment: Enrollment;
  progressEvent: ProgressEvent | null;
  progressPercent: number;
  completedNow: boolean;
  /**
   * When `completedNow` is true and `issueCertificate` was wired,
   * the result of IssueCertificate.execute(). Null on non-completions
   * and on completions when the use case isn't wired.
   */
  certificate: { id: string } | null;
}

export class MarkLessonComplete {
  constructor(private readonly deps: MarkLessonCompleteDeps) {}

  async execute(
    input: MarkLessonCompleteInput,
  ): Promise<Result<MarkLessonCompleteValue, MarkLessonCompleteError>> {
    let enrollment: Enrollment | null;
    try {
      enrollment = await this.deps.enrollmentRepo.findByUserIdAndCourseId(
        input.userId,
        input.courseId,
      );
    } catch {
      return Result.err({ kind: "db_error" });
    }

    if (!enrollment) return Result.err({ kind: "enrollment_not_found" });
    if (enrollment.status !== "active") {
      return Result.err({ kind: "enrollment_not_active" });
    }

    const courseResult = await this.deps.courseRepo.findById(input.courseId);
    if (!courseResult.ok || courseResult.value.status !== "PUBLISHED") {
      return Result.err({ kind: "course_not_found" });
    }

    const course = courseResult.value;
    const lessonIds = course.curriculum.sections.flatMap((section) =>
      section.lessons.map((lesson) => lesson.id),
    );
    if (!lessonIds.includes(input.lessonId)) {
      return Result.err({ kind: "lesson_not_in_course" });
    }

    const completedNow = !enrollment.completedLessonIds.includes(input.lessonId);
    if (completedNow) {
      const prerequisite = prerequisiteForLesson(
        orderLearnerModules(course.curriculum.sections),
        input.lessonId,
      );
      if (prerequisite && !enrollment.completedLessonIds.includes(prerequisite.id)) {
        return Result.err({ kind: "prerequisite_locked", previousLessonId: prerequisite.id });
      }
    }
    enrollment.markLessonComplete(input.lessonId, courseLessonCount(course));

    const updateResult = await this.deps.enrollmentRepo.update(enrollment);
    if (!updateResult.ok) return Result.err({ kind: "db_error" });

    if (!completedNow) {
      return Result.ok({
        enrollment: updateResult.value,
        progressEvent: null,
        progressPercent: updateResult.value.progressPercent,
        completedNow: false,
        certificate: null,
      });
    }

    const eventResult = createProgressEvent({
      id: this.deps.idGen.newId(),
      userId: input.userId,
      courseId: input.courseId,
      lessonId: input.lessonId,
      type: "lesson_completed",
      metadata: { progressPercent: updateResult.value.progressPercent },
      createdAt: this.deps.clock.now(),
    });
    if (!eventResult.ok) return Result.err({ kind: "db_error" });

    const persistedEvent = await this.deps.progressEventRepo.create(eventResult.value);
    if (!persistedEvent.ok) return Result.err({ kind: "db_error" });

    const certificate = await this.tryIssueCertificate(input, updateResult.value.progressPercent);

    return Result.ok({
      enrollment: updateResult.value,
      progressEvent: persistedEvent.value,
      progressPercent: updateResult.value.progressPercent,
      completedNow: true,
      certificate,
    });
  }

  /**
   * Fires IssueCertificate once when the lesson that just completed
   * brings the course to 100%. The use case is `IssueCertificate` does
   * its own validation (enrollment active, no existing cert, etc.) and
   * it sends the certificate email and persists the row. Failures
   * here are swallowed by design: the lesson completion is the
   * user-visible event, and the certificate is a side effect that an
   * admin can re-issue from `/admin/certificates` if it ever fails.
   * On success, when `recordAuditLog` is wired, an audit row is
   * written so the trail distinguishes auto-issued from any future
   * admin re-issue.
   */
  private async tryIssueCertificate(
    input: MarkLessonCompleteInput,
    progressPercent: number,
  ): Promise<{ id: string } | null> {
    if (!this.deps.issueCertificate) return null;
    if (progressPercent < 100) return null;
    const result = await this.deps.issueCertificate.execute({
      userId: input.userId,
      courseId: input.courseId,
    });
    if (!result.ok) {
      // Best-effort: don't fail the lesson completion because the
      // certificate didn't issue. The admin can re-issue from the admin
      // certificates page.
      return null;
    }
    if (this.deps.recordAuditLog) {
      await this.deps.recordAuditLog.execute({
        actorId: "system",
        action: "certificate.issued",
        targetType: "certificate",
        targetId: result.value.certificate.id,
        metadata: {
          userId: input.userId,
          courseId: input.courseId,
          trigger: "course_completion",
        },
      });
    }
    return { id: result.value.certificate.id };
  }
}
