/**
 * RenderCertificatePdf use case tests — TDD (red first).
 *
 * STORY-042: React PDF renderer port + certificate PDF.
 */

import { describe, it, expect, vi } from "vitest";
import { RenderCertificatePdf } from "@/usecases/RenderCertificatePdf";
import { Result } from "@/domain/shared/Result";
import type { Certificate } from "@/domain/entities/Certificate";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { UserRepository, UserError } from "@/ports/repositories/UserRepository";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";
import type {
  CertificateRenderer,
  CertificateRenderInput,
} from "@/ports/rendering/CertificateRenderer";

const CERT_ID = "cert_01";
const USER_ID = "user_01";
const COURSE_ID = "course_01";
const HASH = "a".repeat(64);
const ISSUED_AT = new Date("2026-07-01T00:00:00Z");

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeCertificate(overrides: Partial<Certificate> = {}): Certificate {
  return {
    id: CERT_ID,
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
    email: "student@example.com",
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
    tagline: "Your first steps to Amazon FBA",
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
  findByIdResult: Result<Certificate | null, { kind: "not_found" } | { kind: "db_error"; message: string }>,
): ICertificateRepository {
  return {
    create: vi.fn(async () => Result.ok({} as Certificate)),
    findById: vi.fn(async () => findByIdResult),
    findByVerificationHash: vi.fn(async () => Result.ok(null)),
    findByUserId: vi.fn(async () => Result.ok([])),
    update: vi.fn(async (c: Certificate) => Result.ok(c)),
  };
}

// Cast helpers: Result.ok/err infer the error type as `never` for ok, and
// the success type as `never` for err. We need to widen them so the
// mock repo accepts the call.
function okResult<T>(
  value: T,
): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.ok(value) as unknown as Result<
    T,
    { kind: "not_found" } | { kind: "db_error"; message: string }
  >;
}
function errResult<T>(
  error: { kind: "not_found" } | { kind: "db_error"; message: string },
): Result<T, { kind: "not_found" } | { kind: "db_error"; message: string }> {
  return Result.err(error) as unknown as Result<
    T,
    { kind: "not_found" } | { kind: "db_error"; message: string }
  >;
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
    // STORY-048a: admin CRUD methods (unused by this test)
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
  };
}

function buildRenderer(overrides: {
  buffer?: Buffer;
  throws?: Error;
} = {}): CertificateRenderer & { render: ReturnType<typeof vi.fn> } {
  const fn = vi.fn(async (_input: CertificateRenderInput): Promise<Buffer> => {
    if (overrides.throws) throw overrides.throws;
    return overrides.buffer ?? Buffer.from("%PDF-1.4\n%fake\n%%EOF\n", "utf8");
  });
  return { render: fn };
}

function buildUseCase(overrides: {
  certRepo?: ICertificateRepository;
  userRepo?: UserRepository;
  courseRepo?: CourseRepository;
  renderer?: CertificateRenderer;
} = {}): {
  useCase: RenderCertificatePdf;
  renderer: CertificateRenderer & { render: ReturnType<typeof vi.fn> };
  certRepo: ICertificateRepository;
  userRepo: UserRepository;
  courseRepo: CourseRepository;
} {
  const cert = makeCertificate();
  const certRepo =
    overrides.certRepo ??
    buildCertRepo(okResult<Certificate | null>(cert));
  const userRepo = overrides.userRepo ?? buildUserRepo(Result.ok(makeUser()) as unknown as Result<User, UserError>);
  const courseRepo = overrides.courseRepo ?? buildCourseRepo(Result.ok(makeCourse()) as unknown as Result<Course, CourseError>);
  const renderer = (overrides.renderer as CertificateRenderer & { render: ReturnType<typeof vi.fn> }) ?? buildRenderer();

  return {
    useCase: new RenderCertificatePdf({ certificateRepo: certRepo, userRepo, courseRepo, renderer }),
    renderer,
    certRepo,
    userRepo,
    courseRepo,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("RenderCertificatePdf", () => {
  it("renders a PDF buffer for a valid certificate", async () => {
    const { useCase, renderer } = buildUseCase();

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Buffer.isBuffer(result.value.buffer)).toBe(true);
    expect(result.value.buffer.toString("utf8").startsWith("%PDF-")).toBe(true);
    expect(result.value.verificationHash).toBe(HASH);
    expect(renderer.render).toHaveBeenCalledOnce();
  });

  it("passes the certificate, user, and course to the renderer", async () => {
    const { useCase, renderer } = buildUseCase();

    await useCase.execute({ certificateId: CERT_ID });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const call = (renderer.render as any).mock.calls[0][0] as CertificateRenderInput;
    expect(call.certificate.id).toBe(CERT_ID);
    expect(call.user.firstName).toBe("Maria");
    expect(call.user.lastName).toBe("Santos");
    expect(call.user.email).toBe("student@example.com");
    expect(call.course.title).toBe("Intro to Amazon FBA");
    expect(call.course.tagline).toBe("Your first steps to Amazon FBA");
  });

  it("returns certificate_not_found when the cert does not exist (null)", async () => {
    const certRepo = buildCertRepo(okResult<Certificate | null>(null));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ certificateId: "missing" });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns certificate_not_found when the cert repo returns not_found", async () => {
    const certRepo = buildCertRepo(errResult<Certificate | null>({ kind: "not_found" }));
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ certificateId: "missing" });

    expect(result).toEqual({ ok: false, error: { kind: "certificate_not_found" } });
  });

  it("returns db_error when the cert repo returns a non-not_found error", async () => {
    const certRepo = buildCertRepo(
      errResult<Certificate | null>({ kind: "db_error", message: "connection lost" }),
    );
    const { useCase } = buildUseCase({ certRepo });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("returns user_not_found when the user does not exist", async () => {
    const userRepo = buildUserRepo(Result.err({ kind: "not_found" }) as unknown as Result<User, UserError>);
    const { useCase } = buildUseCase({ userRepo });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result).toEqual({ ok: false, error: { kind: "user_not_found" } });
  });

  it("returns db_error when the user repo returns a non-not_found error", async () => {
    const userRepo = buildUserRepo(
      Result.err({ kind: "db_error", message: "user db down" }) as unknown as Result<User, UserError>,
    );
    const { useCase } = buildUseCase({ userRepo });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    if (result.error.kind !== "db_error") return;
    expect(result.error.message).toBe("user db down");
  });

  it("returns course_not_found when the course does not exist", async () => {
    const courseRepo = buildCourseRepo(Result.err({ kind: "not_found" }) as unknown as Result<Course, CourseError>);
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });

  it("returns db_error when the course repo returns a non-not_found error", async () => {
    const courseRepo = buildCourseRepo(
      Result.err({ kind: "db_error", message: "course db down" }) as unknown as Result<Course, CourseError>,
    );
    const { useCase } = buildUseCase({ courseRepo });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("returns render_error when the renderer throws", async () => {
    const renderer = buildRenderer({ throws: new Error("font not found") });
    const { useCase } = buildUseCase({ renderer });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("render_error");
    if (result.error.kind !== "render_error") return;
    expect(result.error.message).toBe("font not found");
  });

  it("returns render_error when the renderer throws a non-Error value", async () => {
    const renderer = buildRenderer({ throws: "string error" as unknown as Error });
    const { useCase } = buildUseCase({ renderer });

    const result = await useCase.execute({ certificateId: CERT_ID });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("render_error");
    if (result.error.kind !== "render_error") return;
    expect(result.error.message).toBe("string error");
  });

  it("does not call the renderer when the certificate is missing", async () => {
    const certRepo = buildCertRepo(okResult<Certificate | null>(null));
    const renderer = buildRenderer();
    const { useCase } = buildUseCase({ certRepo, renderer });

    await useCase.execute({ certificateId: "missing" });

    expect(renderer.render).not.toHaveBeenCalled();
  });
});
