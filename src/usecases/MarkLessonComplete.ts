import { courseLessonCount } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";
import { createProgressEvent, type ProgressEvent } from "@/domain/entities/ProgressEvent";
import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";

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
  | { kind: "lesson_not_in_course" }
  | { kind: "db_error" };

export interface MarkLessonCompleteValue {
  enrollment: Enrollment;
  progressEvent: ProgressEvent | null;
  progressPercent: number;
  completedNow: boolean;
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
    enrollment.markLessonComplete(input.lessonId, courseLessonCount(course));

    const updateResult = await this.deps.enrollmentRepo.update(enrollment);
    if (!updateResult.ok) return Result.err({ kind: "db_error" });

    if (!completedNow) {
      return Result.ok({
        enrollment: updateResult.value,
        progressEvent: null,
        progressPercent: updateResult.value.progressPercent,
        completedNow: false,
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

    return Result.ok({
      enrollment: updateResult.value,
      progressEvent: persistedEvent.value,
      progressPercent: updateResult.value.progressPercent,
      completedNow: true,
    });
  }
}
