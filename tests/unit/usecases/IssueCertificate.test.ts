/**
 * IssueCertificate use case tests — TDD (red first).
 *
 * STORY-041: Certificate model + repo + IssueCertificate use case.
 */

import { describe, it, expect, vi } from "vitest";
import { IssueCertificate } from "@/usecases/IssueCertificate";
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { Enrollment } from "@/domain/entities/Enrollment";
import type { Certificate } from "@/domain/entities/Certificate";
import type { IEnrollmentRepository } from "@/ports/repositories/IEnrollmentRepository";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import type {
  ICertificateRepository,
  CertificateRepositoryError,
} from "@/ports/repositories/ICertificateRepository";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { Clock } from "@/ports/system/Clock";

const USER_ID = "user_01";
const COURSE_ID = "course_01";
const NOW = new Date("2025-07-01T00:00:00Z");

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCourse(overrides: Partial<Course> = {}): Course {
  return {
    id: COURSE_ID,
    slug: "intro-to-amazon",
    title: "Intro to Amazon",
    tagline: "Learn the basics",
    description: "A course",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    price: { amountMinor: 0, currency: "PHP" } as any,
    curriculum: { sections: [] },
    coverImage: null,
    isFeatured: false,
    displayOrder: 0,
    status: "PUBLISHED",
    courseTier: "FULL",
    previewLessonCount: 0,
    createdAt: NOW,
    ...overrides,
  } as Course;
}

function makeEnrollment(overrides: Partial<Enrollment> = {}): Enrollment {
  return {
    id: "enrollment_01",
    userId: USER_ID,
    courseId: COURSE_ID,
    status: "active",
    source: "direct",
    couponCode: null,
    couponDiscount: null,
    createdAt: NOW,
    completedLessonIds: [],
    lastLessonId: null,
    progressPercent: 100,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    markLessonComplete: (() => {}) as any,
    ...overrides,
  } as Enrollment;
}

// ── Test doubles ───────────────────────────────────────────────────────────

function buildCourseRepo(
  findByIdResult: Result<Course, CourseError> = Result.ok(makeCourse()),
): CourseRepository {
  return {
    listPublished: vi.fn(async () => Result.ok([])),
    listAll: vi.fn(async () => Result.ok([])),
    findById: vi.fn(async () => findByIdResult),
    findBySlug: vi.fn(async () => Result.ok(makeCourse())),
    // STORY-048a: admin CRUD methods (unused by this test)
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };
}

function buildEnrollmentRepo(
  enrollment: Enrollment | null = makeEnrollment(),
): IEnrollmentRepository {
  return {
    findByUserIdAndCourseId: vi.fn(async () => enrollment),
    findByUserId: vi.fn(async () => Result.ok(enrollment ? [enrollment] : [])),
    findById: vi.fn(async (): Promise<Result<Enrollment, { kind: "not_found" }>> =>
      enrollment
        ? Result.ok(enrollment)
        : Result.err({ kind: "not_found" as const }),
    ),
    create: vi.fn(async (e: Enrollment) => Result.ok(e)),
    update: vi.fn(async (e: Enrollment) => Result.ok(e)),
  };
}

function buildCertificateRepo(
  createResult: Result<Certificate, CertificateRepositoryError>,
  existing: readonly Certificate[] = [],
): ICertificateRepository {
  return {
    create: vi.fn(async () => createResult),
    findById: vi.fn(async () => Result.ok(null)),
    findByVerificationHash: vi.fn(async () => Result.ok(null)),
    findByUserId: vi.fn(async () => Result.ok(existing)),
    update: vi.fn(async (c: Certificate) => Result.ok(c)),
  };
}

function buildHashGen(): CertificateHashGenerator {
  return {
    hash: () => "a".repeat(64),
  };
}

function buildIdGen(): IdGenerator {
  let counter = 0;
  return {
    newId: () => {
      counter += 1;
      return `cert_test_${counter.toString().padStart(2, "0")}`;
    },
    paymentRef: () => "pref_test_01",
    receiptNumber: () => "rct_test_01",
  };
}

function buildClock(): Clock {
  return { now: () => NOW };
}

function buildUseCase(overrides: {
  courseRepo?: CourseRepository;
  enrollmentRepo?: IEnrollmentRepository;
  certificateRepo?: ICertificateRepository;
  hashGen?: CertificateHashGenerator;
  idGen?: IdGenerator;
  clock?: Clock;
} = {}): {
  useCase: IssueCertificate;
  certificateRepo: ICertificateRepository;
  hashGen: CertificateHashGenerator;
} {
  const courseRepo = overrides.courseRepo ?? buildCourseRepo();
  const enrollmentRepo = overrides.enrollmentRepo ?? buildEnrollmentRepo();
  const certificateRepo =
    overrides.certificateRepo ??
    buildCertificateRepo(
      Result.ok({
        id: "cert_test_01",
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: "a".repeat(64),
        issuedAt: NOW,
        revokedAt: null,
        revokedReason: null,
        status: "active",
      }),
    );
  const hashGen = overrides.hashGen ?? buildHashGen();
  const idGen = overrides.idGen ?? buildIdGen();
  const clock = overrides.clock ?? buildClock();

  return {
    useCase: new IssueCertificate({
      courseRepo,
      enrollmentRepo,
      certificateRepo,
      hashGen,
      idGen,
      clock,
    }),
    certificateRepo,
    hashGen,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("IssueCertificate", () => {
  it("issues a certificate for a completed course", async () => {
    const { useCase, certificateRepo } = buildUseCase();

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.userId).toBe(USER_ID);
    expect(result.value.certificate.courseId).toBe(COURSE_ID);
    expect(result.value.certificate.status).toBe("active");
    expect(result.value.certificate.revokedAt).toBeNull();
    expect(result.value.isReissue).toBe(false);
    expect(certificateRepo.create).toHaveBeenCalledOnce();
  });

  it("generates a 64-char hex verification hash", async () => {
    const hashSpy: CertificateHashGenerator = {
      hash: vi.fn(() => "b".repeat(64)),
    };
    // Echo repo: returns whatever was passed to create, so the use case's
    // computed hash flows back to the result and we can assert on it.
    const echoRepo: ICertificateRepository = {
      create: vi.fn(async (c: Certificate) => Result.ok(c)),
      findById: vi.fn(async () => Result.ok(null)),
      findByVerificationHash: vi.fn(async () => Result.ok(null)),
      findByUserId: vi.fn(async () => Result.ok([])),
      update: vi.fn(async (c: Certificate) => Result.ok(c)),
    };
    const { useCase } = buildUseCase({ hashGen: hashSpy, certificateRepo: echoRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.certificate.verificationHash).toBe("b".repeat(64));
    expect(result.value.certificate.verificationHash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashSpy.hash).toHaveBeenCalledOnce();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (hashSpy.hash as any).mock.calls[0][0];
    expect(call.userId).toBe(USER_ID);
    expect(call.courseId).toBe(COURSE_ID);
    expect(call.issuedAt).toEqual(NOW);
    // The id passed to the hash gen is whatever idGen produced
    expect(typeof call.id).toBe("string");
    expect(call.id.length).toBeGreaterThan(0);

    // Make sure certificateRepo.create got the same hash
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createCall = (echoRepo.create as any).mock.calls[0][0];
    expect(createCall.verificationHash).toBe("b".repeat(64));
  });

  it("returns course_not_found when the course does not exist", async () => {
    const courseRepo = buildCourseRepo(Result.err({ kind: "not_found" }));
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });

  it("returns db_error when courseRepo.findById returns a non-not_found error", async () => {
    const courseRepo = buildCourseRepo(
      Result.err({ kind: "db_error", message: "connection lost" }),
    );
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("returns enrollment_not_found when no enrollment exists", async () => {
    const enrollmentRepo = buildEnrollmentRepo(null);
    const { useCase } = buildUseCase({ enrollmentRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result).toEqual({ ok: false, error: { kind: "enrollment_not_found" } });
  });

  it("returns course_not_completed when progress < 100", async () => {
    const enrollment = makeEnrollment({ progressPercent: 75 });
    const enrollmentRepo = buildEnrollmentRepo(enrollment);
    const { useCase } = buildUseCase({ enrollmentRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("course_not_completed");
    if (result.error.kind !== "course_not_completed") return;
    expect(result.error.progressPercent).toBe(75);
  });

  it("returns enrollment_not_active when enrollment is cancelled", async () => {
    const enrollment = makeEnrollment({ status: "cancelled", progressPercent: 100 });
    const enrollmentRepo = buildEnrollmentRepo(enrollment);
    const { useCase } = buildUseCase({ enrollmentRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("enrollment_not_active");
    if (result.error.kind !== "enrollment_not_active") return;
    expect(result.error.status).toBe("cancelled");
  });

  it("returns already_issued when a certificate for the same course already exists", async () => {
    const existingCert: Certificate = {
      id: "cert_existing",
      userId: USER_ID,
      courseId: COURSE_ID,
      verificationHash: "c".repeat(64),
      issuedAt: NOW,
      revokedAt: null,
      revokedReason: null,
      status: "active",
    };
    const certificateRepo = buildCertificateRepo(Result.ok(existingCert), [existingCert]);
    const { useCase } = buildUseCase({ certificateRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("already_issued");
    if (result.error.kind !== "already_issued") return;
    expect(result.error.existingCertificateId).toBe("cert_existing");
  });

  it("ignores certificates for OTHER courses when checking already_issued", async () => {
    const otherCourseCert: Certificate = {
      id: "cert_other",
      userId: USER_ID,
      courseId: "course_OTHER",
      verificationHash: "d".repeat(64),
      issuedAt: NOW,
      revokedAt: null,
      revokedReason: null,
      status: "active",
    };
    const certificateRepo = buildCertificateRepo(
      Result.ok({
        id: "cert_test_01",
        userId: USER_ID,
        courseId: COURSE_ID,
        verificationHash: "a".repeat(64),
        issuedAt: NOW,
        revokedAt: null,
        revokedReason: null,
        status: "active",
      }),
      [otherCourseCert],
    );
    const { useCase } = buildUseCase({ certificateRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(true);
  });

  it("returns db_error when certificate persistence fails", async () => {
    const certificateRepo = buildCertificateRepo(
      Result.err({ kind: "db_error", message: "disk full" }),
    );
    const { useCase } = buildUseCase({ certificateRepo });

    const result = await useCase.execute({ userId: USER_ID, courseId: COURSE_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("disk full");
  });
});
