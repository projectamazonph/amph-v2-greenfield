import { describe, it, expect, vi, beforeEach } from "vitest";
import { TierAccessPolicy } from "@/infra/access/TierAccessPolicy";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";

// ── Test fixtures ───────────────────────────────────────────

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: "user_01",
    email: "test@example.com",
    firstName: "Test",
    lastName: "User",
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
    tagline: "Tagline",
    description: "Desc",
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

describe("TierAccessPolicy", () => {
  let mockUserRepo: UserRepository;
  let mockCourseRepo: CourseRepository;
  let policy: TierAccessPolicy;

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
    };
    mockCourseRepo = {
      findById: vi.fn(),
      findBySlug: vi.fn(),
      listPublished: vi.fn(),
      listAll: vi.fn(),
    };
    policy = new TierAccessPolicy(mockUserRepo, mockCourseRepo);
  });

  // ── anonymous / user not found ───────────────────────────

  it("DENIED_NOT_AUTHENTICATED when userId is empty (anonymous)", async () => {
    const result = await policy.canAccess("", COURSE_ID);
    expect(result).toEqual({ kind: "denied_not_authenticated" });
  });

  it("DENIED_NOT_AUTHENTICATED when user not found", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.err({ kind: "not_found" }),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "denied_not_authenticated" });
  });

  // ── course not found / not published ─────────────────────

  it("DENIED_NOT_AUTHENTICATED when course not found", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.err({ kind: "not_found" }),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "denied_not_authenticated" });
  });

  it("DENIED_NOT_AUTHENTICATED when course is DRAFT", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser()));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ status: "DRAFT" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "denied_not_authenticated" });
  });

  it("DENIED_NOT_AUTHENTICATED when course is ARCHIVED", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(Result.ok(makeUser({ subscriptionTier: "PRO" })));
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ status: "ARCHIVED" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "denied_not_authenticated" });
  });

  // ── enrolled users ────────────────────────────────────────

  it("ALLOWED when user is enrolled regardless of subscription tier", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ enrolledCourseIds: [COURSE_ID], subscriptionTier: "FREE" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PRO" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed" });
  });

  // ── tier access ───────────────────────────────────────────

  it("ALLOWED when PRO user accesses PRO course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "PRO" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PRO" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed" });
  });

  it("ALLOWED when PRO user accesses STARTER course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "PRO" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "STARTER" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed" });
  });

  it("ALLOWED when STARTER user accesses STARTER course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "STARTER" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "STARTER" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed" });
  });

  it("DENIED_TIER when STARTER user accesses PRO course (not enrolled)", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "STARTER", enrolledCourseIds: [] })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PRO" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({
      kind: "denied_tier",
      userTier: "STARTER",
      requiredTier: "PRO",
    });
  });

  it("ALLOWED when STARTER user accesses PRO course (enrolled)", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "STARTER", enrolledCourseIds: [COURSE_ID] })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PRO" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed" });
  });

  // ── preview ───────────────────────────────────────────────

  it("ALLOWED_PREVIEW when FREE user accesses PREVIEW course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "FREE" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PREVIEW", previewLessonCount: 2 })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({ kind: "allowed_preview", previewLessonCount: 2 });
  });

  // PREVIEW courses are always preview-accessible regardless of subscription tier (Rule 2).
  // This test confirms STARTER user gets preview access (Rule 2 fires before Rule 3).
  it("ALLOWED_PREVIEW when STARTER user accesses PREVIEW course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "STARTER" })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "PREVIEW", previewLessonCount: 3 })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    // Rule 2 (PREVIEW) fires before Rule 3 (subscription check)
    expect(result).toEqual({ kind: "allowed_preview", previewLessonCount: 3 });
  });

  // ── tier edge cases ───────────────────────────────────────

  it("DENIED_TIER when FREE user accesses STARTER course", async () => {
    vi.mocked(mockUserRepo.findById).mockResolvedValue(
      Result.ok(makeUser({ subscriptionTier: "FREE", enrolledCourseIds: [] })),
    );
    vi.mocked(mockCourseRepo.findById).mockResolvedValue(
      Result.ok(makeCourse({ courseTier: "STARTER" })),
    );

    const result = await policy.canAccess(USER_ID, COURSE_ID);

    expect(result).toEqual({
      kind: "denied_tier",
      userTier: "FREE",
      requiredTier: "STARTER",
    });
  });

});
