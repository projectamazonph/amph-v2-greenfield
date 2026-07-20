/**
 * AuthorizeLessonAccess — P0-5 preview-leak fix.
 *
 * Audit bullet: "Authenticated preview users can view lessons beyond the
 * preview limit." The previous lesson page used CheckCourseAccess which
 * returns { allowed_preview } for any preview-tier access, but the
 * page only differentiated "denied_*" from "non-denied" — so
 * `allowed_preview` granted access to all lessons.
 *
 * This use case decides per-lesson: which user states grant access to
 * which lessons.
 *
 * Test matrix (the 5 audit-mandated states + edge cases):
 * - anonymous:           preview window only
 * - authenticated-preview: preview window only
 * - enrolled:            all lessons
 * - refunded:            preview window only (not all lessons)
 * - admin:               all lessons
 * - index boundary:      previewLessonCount - 1 is allowed, count is denied
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { AuthorizeLessonAccess } from "../AuthorizeLessonAccess";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_01",
    email: "alice@example.com",
    firstName: "Alice",
    lastName: "V.",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    createdAt: new Date(),
    ...overrides,
  } as User;
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: "course_01",
    slug: "test-course",
    title: "Test",
    tagline: "A test",
    description: "A test course",
    price: { minor: 0, currency: "PHP" } as Course["price"],
    curriculum: {
      sections: [
        {
          id: "s1",
          title: "Section 1",
          lessons: [
            { id: "l1", title: "Lesson 1", type: "TEXT", content: {} },
            { id: "l2", title: "Lesson 2", type: "TEXT", content: {} },
            { id: "l3", title: "Lesson 3", type: "TEXT", content: {} },
          ],
        },
        {
          id: "s2",
          title: "Section 2",
          lessons: [
            { id: "l4", title: "Lesson 4", type: "TEXT", content: {} },
            { id: "l5", title: "Lesson 5", type: "TEXT", content: {} },
          ],
        },
      ],
    } as Course["curriculum"],
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 2,
    createdAt: new Date(),
    ...overrides,
  } as Course;
}

function makeEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  const completedLessonIds: string[] = [];
  const e: Enrollment = {
    id: "enr_1",
    userId: "user_01",
    courseId: "course_01",
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: new Date(),
    completedLessonIds,
    lastLessonId: null,
    progressPercent: 0,
    markLessonComplete: function (lessonId: string, courseLessonCount: number) {
      if (!completedLessonIds.includes(lessonId)) {
        completedLessonIds.push(lessonId);
      }
    },
    ...overrides,
  } as unknown as Enrollment;
  return e;
}

describe("AuthorizeLessonAccess (P0-5: preview-leak fix)", () => {
  let mockUserRepo: UserRepository;
  let mockCourseRepo: CourseRepository;
  let mockEnrollmentRepo: IEnrollmentRepository;
  let useCase: AuthorizeLessonAccess;

  beforeEach(() => {
    mockUserRepo = {
      findById: vi.fn(),
      findByEmail: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      emailExists: vi.fn(),
      getPasswordHash: vi.fn(),
      updateTotalXp: vi.fn(),
      listAll: vi.fn(),
    };
    mockCourseRepo = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      listPublished: vi.fn(),
      listAll: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      archive: vi.fn(),
    };
    mockEnrollmentRepo = {
      findByUserIdAndCourseId: vi.fn(),
      create: vi.fn(),
      findByUserId: vi.fn(),
      findByCourseId: vi.fn(),
      findById: vi.fn(),
      update: vi.fn(),
    };
    useCase = new AuthorizeLessonAccess({
      userRepo: mockUserRepo,
      courseRepo: mockCourseRepo,
      enrollmentRepo: mockEnrollmentRepo,
    });
  });

  // ── Anonymous ─────────────────────────────────────────

  it("anonymous: allows lesson within preview window (index < previewLessonCount)", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    const r = await useCase.execute({ userId: "", courseId: "course_01", lessonId: "l1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed_preview");
  });

  it("anonymous: allows the LAST lesson of the preview window (index === previewLessonCount - 1)", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    const r = await useCase.execute({ userId: "", courseId: "course_01", lessonId: "l2" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed_preview");
  });

  it("anonymous: DENIES the first lesson PAST the preview window (index === previewLessonCount)", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    const r = await useCase.execute({ userId: "", courseId: "course_01", lessonId: "l3" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("denied");
  });

  // ── Authenticated, not enrolled, not admin ──────────

  it("authenticated-preview (no enrollment, not admin): allows within window", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed_preview");
  });

  it("authenticated-preview (no enrollment): DENIES past the preview window (P0-5 leak fix)", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l4" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("denied");
  });

  // ── Enrolled ───────────────────────────────────────

  it("enrolled (active Enrollment): allows ANY lesson", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(
      makeEnrollment({ status: "active" }),
    );
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l5" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed");
  });

  // ── Refunded ───────────────────────────────────────

  it("refunded enrollment: DENIES past the preview window (does not count as enrolled)", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(
      makeEnrollment({ status: "refunded" }),
    );
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l5" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("denied");
  });

  it("refunded enrollment: still allows within preview window", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(
      makeEnrollment({ status: "refunded" }),
    );
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed_preview");
  });

  // ── Admin ─────────────────────────────────────────

  it("admin: allows ANY lesson regardless of preview window", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ role: "ADMIN" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l5" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.kind).toBe("allowed");
  });

  // ── Error paths ───────────────────────────────────

  it("returns not_found when course does not exist", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.err({ kind: "not_found" }));
    const r = await useCase.execute({ userId: "user_01", courseId: "missing", lessonId: "l1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("course_not_found");
  });

  it("returns lesson_not_found when lesson does not exist in curriculum", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    const r = await useCase.execute({ userId: "", courseId: "course_01", lessonId: "nope" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("lesson_not_found");
  });

  it("returns user_not_found when authed user lookup fails", async () => {
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.err({ kind: "not_found" }));
    const r = await useCase.execute({ userId: "user_01", courseId: "course_01", lessonId: "l1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("user_not_found");
  });
});
