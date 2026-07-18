/**
 * VerifyCertificate use case tests — TDD (red first).
 *
 * STORY-043: /certificates/[hash] public view + /pdf route.
 */

import { describe, it, expect, vi } from "vitest";
import { VerifyCertificate } from "@/usecases/VerifyCertificate";
import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";

const HASH = "a".repeat(64);
const BAD_HASH = "not-a-valid-hash";
const USER_ID = "user_01";
const COURSE_ID = "course_01";
const ISSUED_AT = new Date("2026-07-01T00:00:00Z");
const REVOKED_AT = new Date("2026-08-01T00:00:00Z");

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: "cert_01",
    userId: USER_ID,
    courseId: COURSE_ID,
    verificationHash: HASH,
    issuedAt: ISSUED_AT,
    revokedAt: null,
    revokedReason: null,
    status: "active",
    ...overrides,
  };
}

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: USER_ID,
    email: "maria@example.com",
    firstName: "Maria",
    lastName: "Santos",
    role: "STUDENT",
    subscriptionTier: "FREE",
    verificationStatus: "VERIFIED",
    enrolledCourseIds: [],
    totalXp: 0,
    avatarUrl: null,
    bio: null,
    emailVerificationToken: null,
    emailVerifiedAt: null,
    paymongoCustomerId: null,
    paymongoDefaultPaymentMethod: null,
    passwordChangedAt: null,
    failedLoginCount: 0,
    lockedUntil: null,
    simulatorAccess: "NONE",
    createdAt: ISSUED_AT,
    updatedAt: ISSUED_AT,
    deletedAt: null,
    ...overrides,
  } as User;
}

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: COURSE_ID,
    slug: "intro-to-amazon",
    title: "Intro to Amazon FBA",
    tagline: "Your first steps",
    description: "A complete course",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    price: { amountMinor: 0, currency: "PHP" } as any,
    curriculum: { sections: [] },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "STARTER",
    previewLessonCount: 0,
    createdAt: ISSUED_AT,
    ...overrides,
  } as Course;
}

// ── Test doubles ───────────────────────────────────────────────────────────

function buildCertRepo(
  findByHashResult: Result<Certificate | null, { kind: "not_found" } | { kind: "db_error"; message: string }>,
): ICertificateRepository {
  return {
    create: vi.fn(async () => Result.ok({} as Certificate)),
    findById: vi.fn(async () => Result.ok(null)),
    findByVerificationHash: vi.fn(async () => findByHashResult),
    findByUserId: vi.fn(async () => Result.ok([])),
    update: vi.fn(async (c: Certificate) => Result.ok(c)),
  };
}

function buildUserRepo(
  findByIdResult: Result<User, UserError>,
): UserRepository {
  return {
    findById: vi.fn(async () => findByIdResult),
    findByEmail: vi.fn(async () => Result.ok({} as User)),
    create: vi.fn(async () => Result.ok({} as User)),
    update: vi.fn(async () => Result.ok({} as User)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function buildCourseRepo(
  findByIdResult: Result<Course, CourseError>,
): CourseRepository {
  return {
    listPublished: vi.fn(async () => Result.ok([])),
    listAll: vi.fn(async () => Result.ok([])),
    findById: vi.fn(async () => findByIdResult),
    findBySlug: vi.fn(async () => Result.ok({} as Course)),
  };
}

function buildUseCase(overrides: {
  certRepo?: ICertificateRepository;
  userRepo?: UserRepository;
  courseRepo?: CourseRepository;
} = {}): {
  useCase: VerifyCertificate;
  certRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
} {
  const cert = makeCertificate();
  const certRepo =
    overrides.certRepo ??
    buildCertRepo(okHashResult<Certificate | null>(cert));
  const userRepo = overrides.userRepo ?? buildUserRepo(Result.ok(makeUser()) as unknown as Result<User, UserError>);
  const courseRepo = overrides.courseRepo ?? buildCourseRepo(Result.ok(makeCourse()) as unknown as Result<Course, CourseError>);

  return {
    useCase: new VerifyCertificate({ certificateRepo: certRepo, userRepo, courseRepo }),
    certRepo,
    userRepo,
    courseRepo,
  };
}

function okHashResult<T>(value: T): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.ok(value) as unknown as Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }>;
}
function errHashResult<T>(error: { kind: "not_found" } | { kind: "db_error"; message: string }): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.err(error) as unknown as Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }>;
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("VerifyCertificate", () => {
  it("returns the cert + user + course for a valid hash", async () => {
    const { useCase } = buildUseCase();

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.verificationHash).toBe(HASH);
    expect(result.value.certificate.status).toBe("active");
    expect(result.value.user.firstName).toBe("Maria");
    expect(result.value.user.lastName).toBe("Santos");
    expect(result.value.course.title).toBe("Intro to Amazon FBA");
    expect(result.value.course.tagline).toBe("Your first steps");
  });

  it("returns a revoked cert (does not hide the record)", async () => {
    const revoked = makeCertificate({
      status: "revoked",
      revokedAt: REVOKED_AT,
      revokedReason: "refund_issued",
    });
    const certRepo = buildCertRepo(okHashResult<Certificate | null>(revoked));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.status).toBe("revoked");
    expect(result.value.certificate.revokedReason).toBe("refund_issued");
  });

  it("returns invalid_hash_format for a non-64-char input", async () => {
    const { useCase, certRepo } = buildUseCase();

    const result = await useCase.execute({ verificationHash: BAD_HASH });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_hash_format" } });
    expect(certRepo.findByVerificationHash).not.toHaveBeenCalled();
  });

  it("returns invalid_hash_format for an empty hash", async () => {
    const { useCase, certRepo } = buildUseCase();

    const result = await useCase.execute({ verificationHash: "" });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_hash_format" } });
    expect(certRepo.findByVerificationHash).not.toHaveBeenCalled();
  });

  it("returns invalid_hash_format for a 64-char non-hex hash", async () => {
    const { useCase, certRepo } = buildUseCase();

    const result = await useCase.execute({ verificationHash: "z".repeat(64) });

    expect(result).toEqual({ ok: false, error: { kind: "invalid_hash_format" } });
    expect(certRepo.findByVerificationHash).not.toHaveBeenCalled();
  });

  it("returns certificate_not_found when the cert repo returns null", async () => {
    const certRepo = buildCertRepo(okHashResult<Certificate | null>(null));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns certificate_not_found when the cert repo returns not_found", async () => {
    const certRepo = buildCertRepo(errHashResult<Certificate | null>({ kind: "not_found" }));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns db_error when the cert repo returns a db_error", async () => {
    const certRepo = buildCertRepo(errHashResult<Certificate | null>({ kind: "db_error", message: "hash index down" }));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("hash index down");
  });

  it("returns user_not_found when the user does not exist (defensive)", async () => {
    const userRepo = buildUserRepo(Result.err({ kind: "not_found" }) as unknown as Result<User, UserError>);
    const { useCase } = buildUseCase({ userRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result).toEqual({ ok: false, error: { kind: "user_not_found" } });
  });

  it("returns db_error when the user repo returns a db_error", async () => {
    const userRepo = buildUserRepo(Result.err({ kind: "db_error", message: "user db down" }) as unknown as Result<User, UserError>);
    const { useCase } = buildUseCase({ userRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("user db down");
  });

  it("returns course_not_found when the course does not exist (defensive)", async () => {
    const courseRepo = buildCourseRepo(Result.err({ kind: "not_found" }) as unknown as Result<Course, CourseError>);
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });

  it("returns db_error when the course repo returns a db_error", async () => {
    const courseRepo = buildCourseRepo(Result.err({ kind: "db_error", message: "course db down" }) as unknown as Result<Course, CourseError>);
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ verificationHash: HASH });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("does not look up user/course when hash format is invalid", async () => {
    const { useCase, userRepo, courseRepo } = buildUseCase();

    await useCase.execute({ verificationHash: BAD_HASH });

    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(courseRepo.findById).not.toHaveBeenCalled();
  });

  it("does not look up user/course when the cert is not found", async () => {
    const certRepo = buildCertRepo(okHashResult<Certificate | null>(null));
    const { useCase, userRepo, courseRepo } = buildUseCase({ certRepo });

    await useCase.execute({ verificationHash: HASH });

    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(courseRepo.findById).not.toHaveBeenCalled();
  });
});
