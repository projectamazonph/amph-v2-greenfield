import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";

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
    title: "Test Course",
    tagline: "A test course",
    description: "Description",
    price: { minor: 1000, currency: "PHP" } as Course["price"],
    curriculum: { sections: [] } as Course["curriculum"],
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 1,
    createdAt: new Date(),
    ...overrides,
  } as Course;
}

describe("EnrollStudent", () => {
  let mockUserRepo: UserRepository;
  let mockCourseRepo: CourseRepository;
  let mockEnrollmentRepo: IEnrollmentRepository;
  let useCase: EnrollStudent;
  let idCounter = 0;

  const USER_ID = "user_01";
  const COURSE_ID = "course_01";

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
      // STORY-048a: admin CRUD methods (unused by this test)
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
    useCase = new EnrollStudent({
      userRepo: mockUserRepo,
      courseRepo: mockCourseRepo,
      enrollmentRepo: mockEnrollmentRepo,
      orderRepo: {
        create: vi.fn(),
        findById: vi.fn(),
        findByPaymongoPaymentId: vi.fn(),
        findByUserId: vi.fn(),
        listAll: vi.fn(),
        listRefundRequests: vi.fn(),
        update: vi.fn(),
        findPaidForUserAndCourse: vi.fn(),
      },
      idGen: { newId: () => `enrol_${++idCounter}` },
    });
  });

  // ── happy path ─────────────────────────────────────────────

  it("returns enrollment on success", async () => {
    const user = makeUser();
    const course = makeCourse();

    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(user));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(course));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    vi.mocked(mockEnrollmentRepo.create).mockResolvedValue(
      Result.ok({
        id: "enrol_1",
        userId: USER_ID,
        courseId: COURSE_ID,
        status: "active" as const,
        source: "direct" as const,
        couponCode: null,
        couponDiscount: null,
        createdAt: new Date(),
        completedLessonIds: [] as string[],
        lastLessonId: null,
        progressPercent: 0,
        markLessonComplete: vi.fn(),
      }),
    );
    vi.mocked(mockUserRepo.update).mockResolvedValue(Result.ok(user));

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBe("enrol_1");
    expect(result.value.userId).toBe(USER_ID);
    expect(result.value.courseId).toBe(COURSE_ID);
  });

  it("creates enrollment with affiliate source", async () => {
    const user = makeUser();
    const course = makeCourse();

    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(user));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(course));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    vi.mocked(mockEnrollmentRepo.create).mockResolvedValue(
      Result.ok({
        id: "enrol_1",
        userId: USER_ID,
        courseId: COURSE_ID,
        status: "active" as const,
        source: "affiliate" as const,
        couponCode: null,
        couponDiscount: null,
        createdAt: new Date(),
        completedLessonIds: [] as string[],
        lastLessonId: null,
        progressPercent: 0,
        markLessonComplete: vi.fn(),
      }),
    );
    vi.mocked(mockUserRepo.update).mockResolvedValue(Result.ok(user));

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      source: "affiliate",
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.source).toBe("affiliate");
  });

  // ── error cases ──────────────────────────────────────────

  it("returns user_not_found when user does not exist", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.err({ kind: "not_found" }));

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("user_not_found");
  });

  it("returns course_not_found when course does not exist", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.err({ kind: "not_found" }));

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_found");
  });

  it("returns course_not_published when course is DRAFT", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ status: "DRAFT" })),
    );

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_published");
  });

  it("returns course_not_published when course is ARCHIVED", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ status: "ARCHIVED" })),
    );

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_published");
  });

  it("returns already_enrolled when user already enrolled (via enrolledCourseIds)", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ enrolledCourseIds: [COURSE_ID] })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_enrolled");
  });

  it("returns already_enrolled when enrollment record exists in DB", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(makeCourse()));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue({
      id: "existing_enroll",
      userId: USER_ID,
      courseId: COURSE_ID,
      status: "active" as const,
      source: "direct" as const,
      couponCode: null,
      couponDiscount: null,
      createdAt: new Date(),
      completedLessonIds: [] as string[],
      lastLessonId: null,
      progressPercent: 0,
      markLessonComplete: vi.fn(),
    });

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_enrolled");
  });

  it("returns already_enrolled when DB unique constraint violated on create", async () => {
    const user = makeUser();
    const course = makeCourse();

    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(user));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(Result.ok(course));
    vi.mocked(mockEnrollmentRepo.findByUserIdAndCourseId).mockResolvedValue(null);
    vi.mocked(mockEnrollmentRepo.create).mockResolvedValue(
      Result.err({ kind: "already_enrolled" }),
    );

    const result = await useCase.execute({
      userId: USER_ID,
      courseId: COURSE_ID,
      entitlement: "admin_grant",
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_enrolled");
  });
});
