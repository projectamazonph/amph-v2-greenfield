/**
 * AdminGrantSubscription use case.
 *
 * Admin manually grants a student a subscription tier outside the
 * checkout flow (paid outside the platform). Covers:
 *  - new user: account created, tier set, audit logged, claim email sent
 *  - existing user: tier updated, no account created, no claim email
 *  - payment metadata recorded in the audit log when provided
 *  - validation: invalid email, missing first/last name for new accounts
 *  - db_error propagation from findByEmail / hash / create / update
 *  - the email_taken race between findByEmail and create
 *  - a rate-limited claim email is logged, not silently dropped
 *  - auto-enrollment: STARTER grants enroll in STARTER + PREVIEW courses,
 *    PRO grants enroll in everything, FREE is a no-op, and re-grants
 *    are idempotent (already_enrolled counts as success)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import type { User } from "@/domain/entities/User";
import type { Course } from "@/domain/entities/Course";
import type { CourseAccessTier } from "@/domain/values/CourseAccessTier";
import type { UserError } from "@/ports/repositories/UserRepository";
import type { PasswordHasher, HashError } from "@/ports/security/PasswordHasher";
import { Money } from "@/domain/values/Money";
import { createCourse } from "@/domain/entities/Course";
import { AdminGrantSubscription } from "../AdminGrantSubscription";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { RequestPasswordReset } from "@/usecases/auth/RequestPasswordReset";
import { EnrollStudent } from "@/usecases/EnrollStudent";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryOrderRepository } from "@/infra/payment/InMemoryOrderRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryPasswordResetRepository } from "@/infra/db/inmemory/InMemoryPasswordResetRepository";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { InMemoryRateLimiter } from "@/infra/security/InMemoryRateLimiter";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { TestLogger } from "@/infra/observability/TestLogger";
import { PasswordResetTemplateRenderer } from "@/infra/email/templates/PasswordResetRenderer";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { FixedClock } from "@/ports/system/Clock";

class StubHasher implements PasswordHasher {
  fails = false;
  async hash(password: string): Promise<Result<string, HashError>> {
    if (this.fails) return Result.err({ kind: "hash_error" });
    return Result.ok(`hashed:${password}`);
  }
  async verify(): Promise<Result<boolean, never>> {
    return Result.ok(true);
  }
}

class CreateFailsRepo extends InMemoryUserRepository {
  async create(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "db_error", message: "insert failed" });
  }
}

class EmailTakenRaceRepo extends InMemoryUserRepository {
  async create(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "email_taken" });
  }
}

class UpdateFailsRepo extends InMemoryUserRepository {
  async update(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "db_error", message: "update failed" });
  }
}

class FindByEmailFailsRepo extends InMemoryUserRepository {
  async findByEmail(): Promise<Result<User, UserError>> {
    return Result.err({ kind: "db_error", message: "lookup failed" });
  }
}

// ── Test data factories ──────────────────────────────────────────────────────

function makeCourse(overrides: {
  id?: string;
  slug?: string;
  courseTier?: CourseAccessTier;
  status?: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  priceMinor?: number;
} = {}): Course {
  const result = createCourse({
    id: overrides.id ?? "course-id",
    slug: overrides.slug ?? "course-slug",
    title: "Test Course",
    tagline: "",
    description: "",
    priceMinor: overrides.priceMinor ?? 0,
    curriculum: {
      sections: [
        {
          id: "seed-section-1",
          title: "Intro",
          lessons: [
            { id: "seed-lesson-1", title: "Welcome", type: "TEXT", content: { body: "Hi" } },
          ],
        },
      ],
    },
    courseTier: overrides.courseTier ?? "STARTER",
    status: overrides.status ?? "PUBLISHED",
  });
  if (!result.ok) throw new Error(`Test setup: createCourse failed: ${result.error.kind}`);
  return result.value;
}

describe("AdminGrantSubscription", () => {
  let users: InMemoryUserRepository;
  let courseRepo: InMemoryCourseRepository;
  let enrollmentRepo: InMemoryEnrollmentRepository;
  let orderRepo: InMemoryOrderRepository;
  let audit: InMemoryAuditLog;
  let email: InMemoryEmailSender;
  let passwordResets: InMemoryPasswordResetRepository;
  let idGen: InMemoryIdGenerator;
  let clock: FixedClock;
  let hasher: StubHasher;
  let logger: TestLogger;
  let rateLimiter: InMemoryRateLimiter;

  beforeEach(() => {
    users = new InMemoryUserRepository();
    courseRepo = new InMemoryCourseRepository();
    enrollmentRepo = new InMemoryEnrollmentRepository();
    orderRepo = new InMemoryOrderRepository();
    audit = new InMemoryAuditLog();
    email = new InMemoryEmailSender();
    passwordResets = new InMemoryPasswordResetRepository();
    idGen = new InMemoryIdGenerator();
    clock = new FixedClock(new Date("2026-01-01T00:00:00Z"));
    hasher = new StubHasher();
    logger = new TestLogger();
    rateLimiter = new InMemoryRateLimiter();
  });

  function build(userRepo: InMemoryUserRepository = users) {
    const recordAuditLog = new RecordAuditLog({ auditLog: audit, idGen, clock });
    const requestPasswordReset = new RequestPasswordReset({
      users: userRepo,
      passwordResets,
      email,
      passwordResetEmailRenderer: new PasswordResetTemplateRenderer(),
      rateLimiter,
      clock,
      ids: idGen,
      logger: new TestLogger(),
      emailTemplateRepo: new InMemoryEmailTemplateRepository(),
    });
    const enrollStudent = new EnrollStudent({
      userRepo,
      courseRepo,
      enrollmentRepo,
      orderRepo,
      idGen,
    });
    return new AdminGrantSubscription({
      userRepo,
      courseRepo,
      idGen,
      passwordHasher: hasher,
      recordAuditLog,
      requestPasswordReset,
      enrollStudent,
      logger,
    });
  }

  it("creates a new account, grants the tier, audits it, and sends a claim email", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "New@Student.com",
      firstName: "Maria",
      lastName: "Santos",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isNewUser).toBe(true);
    expect(r.value.subscriptionTier).toBe("PRO");

    const stored = await users.findByEmail("new@student.com");
    expect(stored.ok).toBe(true);
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("PRO");

    const entries = audit.getAll();
    expect(entries).toHaveLength(1);
    expect(entries[0]!.action).toBe("user.subscription_granted");
    expect(entries[0]!.targetType).toBe("user");
    expect(entries[0]!.metadata).toMatchObject({ subscriptionTier: "PRO", isNewUser: true });

    expect(email.sent).toHaveLength(1);
    expect(email.sent[0]!.to).toBe("new@student.com");
  });

  it("grants a tier to an existing user without creating an account or sending a claim email", async () => {
    await users.create({
      id: "user-1",
      email: "existing@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });

    const useCase = build();
    const r = await useCase.execute({
      email: "existing@student.com",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.isNewUser).toBe(false);
    expect(r.value.userId).toBe("user-1");

    const stored = await users.findByEmail("existing@student.com");
    expect(stored.ok).toBe(true);
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("STARTER");

    expect(email.sent).toHaveLength(0);
    expect(audit.getAll()[0]).toMatchObject({ action: "user.subscription_changed" });
    expect(audit.getAll()[0]!.metadata).toMatchObject({
      isNewUser: false,
      previousTier: "FREE",
      subscriptionTier: "STARTER",
    });
  });

  it("allows correcting a mistaken grant back to FREE", async () => {
    await users.create({
      id: "user-1",
      email: "oops@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });
    const useCase = build();
    const r = await useCase.execute({
      email: "oops@student.com",
      subscriptionTier: "FREE",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);
    const stored = await users.findByEmail("oops@student.com");
    if (stored.ok) expect(stored.value.subscriptionTier).toBe("FREE");
  });

  it("records payment method, amount, and reference in the audit metadata", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "paid@student.com",
      firstName: "Ana",
      lastName: "Reyes",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
      payment: { method: "GCash", amount: Money.php(2999), reference: "ref-123" },
    });

    expect(r.ok).toBe(true);
    expect(audit.getAll()[0]!.metadata).toMatchObject({
      paymentMethod: "GCash",
      paymentAmountMinor: 299900,
      paymentReference: "ref-123",
    });
  });

  it("does not record payment metadata when no payment is given", async () => {
    const useCase = build();
    await useCase.execute({
      email: "free-grant@student.com",
      firstName: "Ana",
      lastName: "Reyes",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(audit.getAll()[0]!.metadata.paymentMethod).toBeUndefined();
  });

  it("rejects an invalid email", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "not-an-email",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_email");
  });

  it("requires a first name for a brand-new account", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "noname@student.com",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "invalid_name", field: "firstName" });
  });

  it("requires a last name for a brand-new account", async () => {
    const useCase = build();
    const r = await useCase.execute({
      email: "noname2@student.com",
      firstName: "A",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "invalid_name", field: "lastName" });
  });

  it("propagates a db_error when password hashing fails", async () => {
    hasher.fails = true;
    const useCase = build();
    const r = await useCase.execute({
      email: "hashfail@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("db_error");
  });

  it("propagates a db_error when the initial email lookup fails, without misreporting it as a name-validation error", async () => {
    const repo = new FindByEmailFailsRepo();
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "lookupfail@student.com",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "db_error", message: "lookup failed" });
  });

  it("propagates a db_error when user creation fails", async () => {
    const repo = new CreateFailsRepo();
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "createfail@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "db_error", message: "insert failed" });
  });

  it("propagates a db_error when the tier update fails", async () => {
    const repo = new UpdateFailsRepo();
    await repo.create({
      id: "user-1",
      email: "updatefail@student.com",
      passwordHash: "real-hash",
      firstName: "Juan",
      lastName: "Cruz",
    });
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "updatefail@student.com",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toEqual({ kind: "db_error", message: "update failed" });
  });

  it("falls back to db_error when create races on email_taken and the re-lookup also fails", async () => {
    const repo = new EmailTakenRaceRepo();
    const useCase = build(repo);
    const r = await useCase.execute({
      email: "race@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.kind).toBe("db_error");
      expect(r.error).toMatchObject({ message: "email_taken but lookup failed" });
    }
  });

  it("logs a warning instead of silently dropping a rate-limited claim email", async () => {
    const useCase = build();
    // Exhaust the shared IP rate-limit bucket (20/hour) RequestPasswordReset
    // enforces for the fixed "admin-grant" key every grant shares.
    for (let i = 0; i < 20; i++) {
      await useCase.execute({
        email: `bulk-${i}@student.com`,
        firstName: "A",
        lastName: "B",
        subscriptionTier: "STARTER",
        actorId: "admin-1",
      });
    }
    email.clear();

    const r = await useCase.execute({
      email: "rate-limited@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });

    expect(r.ok).toBe(true);
    expect(email.sent).toHaveLength(0);
    const warning = logger.entries.find(
      (e) => e.level === "warn" && e.message === "admin_grant_subscription.claim_email_failed",
    );
    expect(warning).toBeDefined();
  });

  // ── Auto-enrollment: tier-based access grant creates Enrollment rows ──

  it("auto-enrolls a STARTER-grant student in every published STARTER and PREVIEW course", async () => {
    courseRepo.seed([
      makeCourse({ id: "c-starter", slug: "starter", courseTier: "STARTER" }),
      makeCourse({ id: "c-preview", slug: "preview", courseTier: "PREVIEW" }),
      makeCourse({ id: "c-pro-only", slug: "pro-only", courseTier: "PRO" }),
      makeCourse({ id: "c-draft", slug: "draft", courseTier: "STARTER", status: "DRAFT" }),
    ]);

    const useCase = build();
    const r = await useCase.execute({
      email: "fresh@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    const enrollmentsResult = await enrollmentRepo.findByUserId(r.ok ? r.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    const courseIds = enrollmentsResult.value.map((e) => e.courseId).sort();
    expect(courseIds).toEqual(["c-preview", "c-starter"]);

    const entry = audit.getAll()[0]!;
    expect(entry.metadata).toMatchObject({
      subscriptionTier: "STARTER",
      enrolledCourseIds: expect.arrayContaining(["c-preview", "c-starter"]),
    });
  });

  it("auto-enrolls a PRO-grant student in every published course regardless of tier", async () => {
    courseRepo.seed([
      makeCourse({ id: "c-starter", slug: "starter", courseTier: "STARTER" }),
      makeCourse({ id: "c-pro", slug: "pro", courseTier: "PRO" }),
      makeCourse({ id: "c-preview", slug: "preview", courseTier: "PREVIEW" }),
      makeCourse({ id: "c-draft", slug: "draft", courseTier: "STARTER", status: "DRAFT" }),
    ]);

    const useCase = build();
    const r = await useCase.execute({
      email: "vip@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    const enrollmentsResult = await enrollmentRepo.findByUserId(r.ok ? r.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    const courseIds = enrollmentsResult.value.map((e) => e.courseId).sort();
    expect(courseIds).toEqual(["c-preview", "c-pro", "c-starter"]);
  });

  it("does not auto-enroll on a FREE grant (revocation only)", async () => {
    courseRepo.seed([
      makeCourse({ id: "c-starter", slug: "starter", courseTier: "STARTER" }),
      makeCourse({ id: "c-preview", slug: "preview", courseTier: "PREVIEW" }),
    ]);

    const useCase = build();
    const r = await useCase.execute({
      email: "revoke@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "FREE",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    const enrollmentsResult = await enrollmentRepo.findByUserId(r.ok ? r.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    expect(enrollmentsResult.value).toHaveLength(0);

    const entry = audit.getAll()[0]!;
    expect(entry.metadata).toMatchObject({
      subscriptionTier: "FREE",
      enrolledCourseIds: [],
    });
  });

  it("auto-enrolls into paid courses too (admin_grant entitlement bypasses paywall)", async () => {
    // priceMinor > 0 = paid course. EnrollStudent's P0-1 paywall check
    // would refuse `entitlement: "free"` here; the grant path uses
    // `entitlement: "admin_grant"`, which is trusted.
    courseRepo.seed([
      makeCourse({ id: "c-paid-starter", slug: "paid-starter", courseTier: "STARTER", priceMinor: 299900 }),
    ]);

    const useCase = build();
    const r = await useCase.execute({
      email: "paid-grant@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    const enrollmentsResult = await enrollmentRepo.findByUserId(r.ok ? r.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    expect(enrollmentsResult.value.map((e) => e.courseId)).toEqual(["c-paid-starter"]);
  });

  it("is idempotent — re-granting the same tier does not fail and counts already-enrolled courses", async () => {
    courseRepo.seed([
      makeCourse({ id: "c-starter", slug: "starter", courseTier: "STARTER" }),
      makeCourse({ id: "c-preview", slug: "preview", courseTier: "PREVIEW" }),
    ]);

    const useCase = build();
    const first = await useCase.execute({
      email: "repeat@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(first.ok).toBe(true);

    const second = await useCase.execute({
      email: "repeat@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(second.ok).toBe(true);

    // Still exactly one enrollment row per course, not two.
    const enrollmentsResult = await enrollmentRepo.findByUserId(first.ok ? first.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    expect(enrollmentsResult.value).toHaveLength(2);

    // Both grant audits list the full set of eligible courses.
    const entries = audit.getAll();
    expect(entries).toHaveLength(2);
    expect(entries[0]!.metadata).toMatchObject({
      enrolledCourseIds: expect.arrayContaining(["c-preview", "c-starter"]),
    });
    expect(entries[1]!.metadata).toMatchObject({
      enrolledCourseIds: expect.arrayContaining(["c-preview", "c-starter"]),
    });
  });

  it("downgrades keep existing enrollments and add no new ones", async () => {
    // First grant PRO to a student who already has a paid enrollment in
    // a PRO course (e.g. they bought it individually before the grant).
    courseRepo.seed([
      makeCourse({ id: "c-pro", slug: "pro", courseTier: "PRO", priceMinor: 499900 }),
    ]);
    const useCase = build();
    const proGrant = await useCase.execute({
      email: "downgrade@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "PRO",
      actorId: "admin-1",
    });
    expect(proGrant.ok).toBe(true);

    // Now downgrade to FREE. The PRO enrollment must stay (they paid
    // for it individually) and no new enrollments should appear.
    const freeGrant = await useCase.execute({
      email: "downgrade@student.com",
      subscriptionTier: "FREE",
      actorId: "admin-1",
    });
    expect(freeGrant.ok).toBe(true);

    const enrollmentsResult = await enrollmentRepo.findByUserId(
      proGrant.ok ? proGrant.value.userId : "x",
    );
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    expect(enrollmentsResult.value.map((e) => e.courseId)).toEqual(["c-pro"]);

    const downgradeEntry = audit.getAll()[1]!;
    expect(downgradeEntry.metadata).toMatchObject({
      subscriptionTier: "FREE",
      enrolledCourseIds: [],
    });
  });

  it("does not fail the grant if a single course fails to enroll (logged + continued)", async () => {
    courseRepo.seed([
      makeCourse({ id: "c-ok", slug: "ok", courseTier: "STARTER" }),
      makeCourse({ id: "c-bad", slug: "bad", courseTier: "STARTER" }),
    ]);

    // Make the enrollment repo fail only for the second course.
    const realCreate = enrollmentRepo.create.bind(enrollmentRepo);
    let calls = 0;
    enrollmentRepo.create = async (enrollment) => {
      calls++;
      if (enrollment.courseId === "c-bad") {
        return Result.err({ kind: "db_error", message: "transient failure" });
      }
      return realCreate(enrollment);
    };

    const useCase = build();
    const r = await useCase.execute({
      email: "partial@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    // The good course is enrolled; the bad one is logged.
    const enrollmentsResult = await enrollmentRepo.findByUserId(r.ok ? r.value.userId : "x");
    expect(enrollmentsResult.ok).toBe(true);
    if (!enrollmentsResult.ok) return;
    expect(enrollmentsResult.value.map((e) => e.courseId)).toEqual(["c-ok"]);

    const warn = logger.entries.find(
      (e) => e.level === "warn" && e.message === "admin_grant_subscription.auto_enroll_failed",
    );
    expect(warn).toBeDefined();

    // Audit still records the courses that ended up enrolled.
    const entry = audit.getAll()[0]!;
    expect(entry.metadata).toMatchObject({ enrolledCourseIds: ["c-ok"] });
    expect(calls).toBe(2);
  });

  it("logs a warning and proceeds when the course listing itself fails", async () => {
    const realList = courseRepo.listPublished.bind(courseRepo);
    courseRepo.listPublished = async () =>
      Result.err({ kind: "db_error", message: "catalog down" });

    const useCase = build();
    const r = await useCase.execute({
      email: "listfail@student.com",
      firstName: "A",
      lastName: "B",
      subscriptionTier: "STARTER",
      actorId: "admin-1",
    });
    expect(r.ok).toBe(true);

    const warn = logger.entries.find(
      (e) => e.level === "warn" && e.message === "admin_grant_subscription.course_list_failed",
    );
    expect(warn).toBeDefined();

    const entry = audit.getAll()[0]!;
    expect(entry.metadata).toMatchObject({ enrolledCourseIds: [] });

    courseRepo.listPublished = realList;
  });
});
