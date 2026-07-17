import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { MarkLessonComplete } from "@/usecases/MarkLessonComplete";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";
import type { Enrollment, EnrollmentStatus } from "@/domain/entities/Enrollment";
import type { Course } from "@/domain/entities/Course";

const USER_ID = "user_01";
const COURSE_ID = "course_01";
const LESSON_ID = "les_02";
const ENROLLMENT_ID = "enroll_01";

function makeEnrollment(overrides: Partial<{
  status: EnrollmentStatus;
  completedLessonIds: string[];
  lastLessonId: string | null;
  progressPercent: number;
}> = {}): Enrollment {
  // Use the real markLessonComplete implementation from the domain entity
  const enrollment: Enrollment = {
    id: ENROLLMENT_ID,
    userId: USER_ID,
    courseId: COURSE_ID,
    status: "active" as EnrollmentStatus,
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date(),
    completedLessonIds: [] as string[],
    lastLessonId: null as string | null,
    progressPercent: 0,
    markLessonComplete: function (this: Enrollment, lessonId: string, courseLessonCount: number): void {
      if (!this.completedLessonIds.includes(lessonId)) {
        this.completedLessonIds.push(lessonId);
        this.progressPercent = courseLessonCount > 0
          ? Math.min(100, Math.round((this.completedLessonIds.length / courseLessonCount) * 100))
          : 0;
      }
      this.lastLessonId = lessonId;
    },
    ...overrides,
  };
  return enrollment;
}

function makeCourse(lessonIds: string[]): Course {
  return {
    id: COURSE_ID,
    slug: "test-course",
    title: "Test Course",
    tagline: "",
    description: "",
    price: { minor: 10000, currency: "PHP", formatted: "PHP 100" },
    curriculum: {
      sections: [
        {
          id: "section_01",
          title: "Section 1",
          lessons: lessonIds.map((id) => ({
            id,
            title: `Lesson ${id}`,
            type: "TEXT" as const,
            content: { type: "TEXT", body: "" },
          })),
        },
      ],
    },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED" as const,
    courseTier: "STARTER" as const,
    previewLessonCount: 1,
    createdAt: new Date(),
  } as unknown as Course;
}

const NOW = new Date("2025-07-01T00:00:00Z");
const mockClock: Clock = { now: vi.fn(() => NOW) };
const mockIdGen: IdGenerator = {
    newId: vi.fn(() => "evt_01"),
    paymentRef: vi.fn(() => "AMPH-abc123"),
    receiptNumber: vi.fn(() => "RCP-001"),
  };

function makeEnrollmentRepo(enrollment: Enrollment | null): IEnrollmentRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdAndCourseId: vi.fn(async () => enrollment),
    update: vi.fn(async (e: Enrollment) => Result.ok(e)),
  };
}

function makeCourseRepo(course: Course | null): CourseRepository {
  return {
    findBySlug: vi.fn(),
    findById: vi.fn(
      async (id: string) =>
        course && id === course.id ? Result.ok(course) : Result.err({ kind: "not_found" }),
    ) as CourseRepository["findById"],
    listAll: vi.fn(),
  } as unknown as CourseRepository;
}

function makeProgressEventRepo(): IProgressEventRepository {
  return {
    create: vi.fn(async (e) => Result.ok(e)),
    findByUserId: vi.fn(),
    findByCourseId: vi.fn(),
  };
}

describe("MarkLessonComplete", () => {
  // ── happy path ───────────────────────────────────────────

  it("returns enrollment + event + progressPercent for valid request", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01", "les_02", "les_03"]);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      lessonId: LESSON_ID,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.progressPercent).toBe(33); // 1/3
    expect(result.value.progressEvent.type).toBe("lesson_completed");
    expect(result.value.progressEvent.lessonId).toBe(LESSON_ID);
  });

  it("calls enrollment.markLessonComplete with correct args", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01", "les_02"]);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_02" });

    // markLessonComplete updates completedLessonIds and progressPercent
    expect(enrollment.completedLessonIds).toContain("les_02");
    expect(enrollment.progressPercent).toBe(50); // 1/2 lessons
  });

  it("persists updated enrollment via enrollmentRepo.update", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01"]);
    const mockRepo = makeEnrollmentRepo(enrollment);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: mockRepo,
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    expect(mockRepo.update).toHaveBeenCalledOnce();
  });

  it("emits lesson_completed ProgressEvent", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01"]);
    const mockEventRepo = makeProgressEventRepo();
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: mockEventRepo,
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.progressEvent.type).toBe("lesson_completed");
    expect(result.value.progressEvent.lessonId).toBe("les_01");
    expect(mockEventRepo.create).toHaveBeenCalledOnce();
  });

  it("idempotent: same lesson twice → completedLessonIds has no duplicates", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01"]);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    // First call
    await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });
    // Second call (idempotent)
    await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    // markLessonComplete called once per execute (enrollment is shared)
    expect(enrollment.completedLessonIds).toEqual(["les_01"]);
  });

  // ── error cases ──────────────────────────────────────────

  it("returns enrollment_not_found when no enrollment exists", async () => {
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(null),
      courseRepo: makeCourseRepo(makeCourse(["les_01"])),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("enrollment_not_found");
  });

  it("returns enrollment_not_active when enrollment is cancelled", async () => {
    const enrollment = makeEnrollment({ status: "cancelled" });
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(makeCourse(["les_01"])),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("enrollment_not_active");
  });

  it("returns course_not_found when course does not exist", async () => {
    const enrollment = makeEnrollment();
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(null),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_01" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("returns lesson_not_in_course when lessonId not in curriculum", async () => {
    const enrollment = makeEnrollment();
    const course = makeCourse(["les_01", "les_02"]);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "nonexistent" });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("lesson_not_in_course");
  });

  it("returns correct progressPercent on second lesson completion", async () => {
    const enrollment = makeEnrollment({ completedLessonIds: ["les_01"], progressPercent: 50 });
    const course = makeCourse(["les_01", "les_02"]);
    const useCase = new MarkLessonComplete({
      enrollmentRepo: makeEnrollmentRepo(enrollment),
      courseRepo: makeCourseRepo(course),
      progressEventRepo: makeProgressEventRepo(),
      idGen: mockIdGen,
      clock: mockClock,
    });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID, lessonId: "les_02" });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.progressPercent).toBe(100);
  });
});
