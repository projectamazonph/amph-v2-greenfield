import { describe, expect, it, vi } from "vitest";

import type { Course } from "@/domain/entities/Course";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { Result } from "@/domain/shared/Result";
import type { CourseRepository } from "@/ports/repositories/CourseRepository";
import type { IProgressEventRepository } from "@/ports/repositories/IProgressEventRepository";
import type { ICertificateRepository } from "@/ports/repositories/ICertificateRepository";
import type { Clock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import type { CertificateHashGenerator } from "@/ports/security/CertificateHashGenerator";
import type { UserRepository } from "@/ports/repositories/UserRepository";
import type { EmailSender } from "@/ports/email/EmailSender";
import type { CertificateEmailRenderer } from "@/ports/email/CertificateEmailRenderer";
import type { IEmailTemplateRepository } from "@/ports/repositories/IEmailTemplateRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";

import type { Logger } from "@/ports/observability/Logger";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryCertificateRepository } from "@/infra/repositories/InMemoryCertificateRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryEmailSender } from "@/infra/email/InMemoryEmailSender";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { TestLogger } from "@/infra/observability/TestLogger";
import { MarkLessonComplete } from "@/usecases/MarkLessonComplete";
import { IssueCertificate } from "@/usecases/IssueCertificate";

const course = {
  id: "course-1",
  slug: "ppc-foundations",
  title: "PPC Foundations",
  status: "PUBLISHED",
  curriculum: {
    sections: [
      {
        id: "module-1",
        title: "Module 1",
        lessons: [
          { id: "lesson-1", title: "First", type: "TEXT", content: {} },
          { id: "lesson-2", title: "Second", type: "TEXT", content: {} },
        ],
      },
    ],
  },
} as unknown as Course;

function courseRepo(): CourseRepository {
  return {
    findById: vi.fn(async (id: string) =>
      id === course.id ? Result.ok(course) : Result.err({ kind: "not_found" }),
    ),
  } as unknown as CourseRepository;
}

function progressRepo(): IProgressEventRepository {
  return {
    create: vi.fn(async (event) => Result.ok(event)),
    findByUserId: vi.fn(),
    findByCourseId: vi.fn(),
  };
}

const idGen = {
  newId: vi.fn(() => "event-1"),
} as unknown as IdGenerator;

const clock: Clock = { now: () => new Date("2026-08-10T00:00:00.000Z") };

async function setup() {
  const enrollmentRepo = new InMemoryEnrollmentRepository();
  const enrollmentResult = createEnrollment({
    id: "enrollment-1",
    userId: "student-1",
    courseId: course.id,
  });
  if (!enrollmentResult.ok) throw new Error("Enrollment fixture failed");
  await enrollmentRepo.create(enrollmentResult.value);

  const events = progressRepo();
  const useCase = new MarkLessonComplete({
    enrollmentRepo,
    courseRepo: courseRepo(),
    progressEventRepo: events,
    idGen,
    clock,
  });

  return { enrollmentRepo, events, useCase };
}

describe("MarkLessonComplete", () => {
  it("persists owned lesson progress and emits one completion event", async () => {
    const { enrollmentRepo, events, useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-1",
    });

    expect(result).toMatchObject({ ok: true, value: { progressPercent: 50 } });
    const stored = await enrollmentRepo.findByUserIdAndCourseId("student-1", course.id);
    expect(stored?.completedLessonIds).toEqual(["lesson-1"]);
    expect(stored?.lastLessonId).toBe("lesson-1");
    expect(events.create).toHaveBeenCalledTimes(1);
  });

  it("rejects completion of a later lesson before its prerequisite", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-2",
    });

    expect(result).toEqual(
      Result.err({ kind: "prerequisite_locked", previousLessonId: "lesson-1" }),
    );
  });

  it("is idempotent when the same lesson is submitted twice", async () => {
    const { enrollmentRepo, events, useCase } = await setup();
    const input = { userId: "student-1", courseId: course.id, lessonId: "lesson-1" };

    await useCase.execute(input);
    const result = await useCase.execute(input);

    expect(result).toMatchObject({ ok: true, value: { progressPercent: 50 } });
    const stored = await enrollmentRepo.findByUserIdAndCourseId("student-1", course.id);
    expect(stored?.completedLessonIds).toEqual(["lesson-1"]);
    expect(events.create).toHaveBeenCalledTimes(1);
  });

  it("rejects completion without an active enrollment", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "another-student",
      courseId: course.id,
      lessonId: "lesson-1",
    });

    expect(result).toEqual(Result.err({ kind: "enrollment_not_found" }));
  });

  it("rejects a lesson outside the enrolled course", async () => {
    const { useCase } = await setup();

    const result = await useCase.execute({
      userId: "student-1",
      courseId: course.id,
      lessonId: "lesson-from-another-course",
    });

    expect(result).toEqual(Result.err({ kind: "lesson_not_in_course" }));
  });

  it("issues a certificate when the completed lesson is the last one (auto-issuance)", async () => {
    // Wires MarkLessonComplete with the same IssueCertificate use case the
    // production container exposes, plus an audit log so we can assert
    // that the issuance wrote a `certificate.issued` row.
    const enrollmentRepo = new InMemoryEnrollmentRepository();
    const enrollmentResult = createEnrollment({
      id: "enrollment-2",
      userId: "student-2",
      courseId: course.id,
    });
    if (!enrollmentResult.ok) throw new Error("Enrollment fixture failed");
    await enrollmentRepo.create(enrollmentResult.value);

    const certificateRepo: ICertificateRepository = new InMemoryCertificateRepository();
    const auditLog = new InMemoryAuditLog();
    const testLogger = new TestLogger();
    const recordAuditLog = new RecordAuditLog({
      auditLog,
      idGen,
      clock,
      logger: testLogger,
    });
    const issueCertificate = new IssueCertificate({
      enrollmentRepo,
      courseRepo: courseRepo(),
      certificateRepo,
      hashGen: { hash: () => "a".repeat(64) } as CertificateHashGenerator,
      idGen: { newId: () => "cert-1" } as IdGenerator,
      clock,
      userRepo: {
        findById: async () => Result.err({ kind: "not_found" }),
      } as unknown as UserRepository,
      emailSender: { send: async () => Result.ok(undefined) } as unknown as EmailSender,
      certificateEmailRenderer: { render: () => null } as unknown as CertificateEmailRenderer,
      logger: testLogger,
      emailTemplateRepo: {
        findByType: async () => Result.ok(null),
      } as unknown as IEmailTemplateRepository,
    });

    const progressEvents: unknown[] = [];
    const useCase = new MarkLessonComplete({
      enrollmentRepo,
      courseRepo: courseRepo(),
      progressEventRepo: {
        create: async (event: unknown) => {
          progressEvents.push(event);
          return Result.ok(event as never);
        },
      } as unknown as IProgressEventRepository,
      idGen,
      clock,
      issueCertificate,
      recordAuditLog,
    });

    // Complete lesson-1 (50%), then lesson-2 (100%, the trigger).
    const first = await useCase.execute({
      userId: "student-2",
      courseId: course.id,
      lessonId: "lesson-1",
    });
    expect(first.ok).toBe(true);
    if (first.ok) {
      expect(first.value.progressPercent).toBe(50);
      expect(first.value.certificate).toBeNull();
    }

    const second = await useCase.execute({
      userId: "student-2",
      courseId: course.id,
      lessonId: "lesson-2",
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.value.progressPercent).toBe(100);
    expect(second.value.certificate).toEqual({ id: "cert-1" });

    // The certificate is persisted and the audit row is written.
    const persisted = await certificateRepo.findById("cert-1");
    expect(persisted.ok).toBe(true);
    if (persisted.ok) {
      expect(persisted.value).not.toBeNull();
      expect(persisted.value?.courseId).toBe(course.id);
      expect(persisted.value?.userId).toBe("student-2");
    }

    const auditPage = await auditLog.list({ limit: 100 });
    expect(auditPage.ok).toBe(true);
    if (!auditPage.ok) return;
    const issued = auditPage.value.entries.find((a) => a.action === "certificate.issued");
    expect(issued).toBeDefined();
    expect(issued?.targetType).toBe("certificate");
    expect(issued?.targetId).toBe("cert-1");
    expect(issued?.metadata).toMatchObject({
      userId: "student-2",
      courseId: course.id,
      trigger: "course_completion",
    });
  });
});
