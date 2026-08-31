import { beforeEach, describe, expect, it } from "vitest";
import { AdminSetEnrollmentStatus } from "@/usecases/AdminSetEnrollmentStatus";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryEnrollmentRepository } from "@/infra/repositories/InMemoryEnrollmentRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { FixedClock } from "@/ports/system/Clock";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { createCourse } from "@/domain/entities/Course";
import { createEnrollment } from "@/domain/entities/Enrollment";
import { SilentLogger } from "@/infra/observability/SilentLogger";

describe("AdminSetEnrollmentStatus", () => {
  const userId = "student-1";
  const courseId = "course-1";
  const actorId = "admin-1";
  const now = new Date("2026-08-10T08:00:00.000Z");

  let users: InMemoryUserRepository;
  let courses: InMemoryCourseRepository;
  let enrollments: InMemoryEnrollmentRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminSetEnrollmentStatus;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    courses = new InMemoryCourseRepository();
    enrollments = new InMemoryEnrollmentRepository();
    audit = new InMemoryAuditLog();
    const ids = new InMemoryIdGenerator();
    const clock = new FixedClock(now);

    await users.create({
      id: userId,
      email: "student@example.com",
      passwordHash: "hash",
      firstName: "Ana",
      lastName: "Santos",
    });
    const course = createCourse({
      id: courseId,
      slug: "amazon-ppc-foundations",
      title: "Amazon PPC Foundations",
      tagline: "Build the basics",
      description: "A published course",
      priceMinor: 299900,
      status: "PUBLISHED",
      curriculum: {
        sections: [
          {
            id: "module-1",
            title: "Module 1",
            lessons: [{ id: "lesson-1", title: "Lesson 1", type: "TEXT", content: "" }],
          },
        ],
      },
    });
    if (!course.ok) throw new Error("course fixture failed");
    await courses.create(course.value);

    useCase = new AdminSetEnrollmentStatus({
      userRepo: users,
      courseRepo: courses,
      enrollmentRepo: enrollments,
      idGen: ids,
      clock,
      recordAuditLog: new RecordAuditLog({
        auditLog: audit,
        idGen: ids,
        clock,
        logger: new SilentLogger(),
      }),
    });
  });

  it("grants a new active enrollment and records the admin actor", async () => {
    const result = await useCase.execute({ userId, courseId, actorId, status: "active" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.change).toBe("granted");
    const stored = await enrollments.findByUserIdAndCourseId(userId, courseId);
    expect(stored?.status).toBe("active");
    expect(stored?.createdAt).toEqual(now);
    expect(audit.getAll()[0]).toMatchObject({
      actorId,
      action: "enrollment.granted",
      targetType: "enrollment",
    });
  });

  it("cancels an active enrollment without deleting progress", async () => {
    const enrollment = createEnrollment({ id: "enrollment-1", userId, courseId, createdAt: now });
    if (!enrollment.ok) throw new Error("enrollment fixture failed");
    enrollment.value.completedLessonIds.push("lesson-1");
    enrollment.value.progressPercent = 50;
    await enrollments.create(enrollment.value);

    const result = await useCase.execute({ userId, courseId, actorId, status: "cancelled" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.change).toBe("revoked");
    const stored = await enrollments.findByUserIdAndCourseId(userId, courseId);
    expect(stored?.status).toBe("cancelled");
    expect(stored?.completedLessonIds).toEqual(["lesson-1"]);
    expect(stored?.progressPercent).toBe(50);
    expect(audit.getAll()[0]?.action).toBe("enrollment.revoked");
  });

  it("restores a cancelled enrollment instead of creating a duplicate", async () => {
    const enrollment = createEnrollment({ id: "enrollment-1", userId, courseId, createdAt: now });
    if (!enrollment.ok) throw new Error("enrollment fixture failed");
    await enrollments.create(enrollment.value);
    await enrollments.update({ ...enrollment.value, status: "cancelled" });

    const result = await useCase.execute({ userId, courseId, actorId, status: "active" });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.change).toBe("restored");
    const stored = await enrollments.findByUserIdAndCourseId(userId, courseId);
    expect(stored?.id).toBe("enrollment-1");
    expect(stored?.status).toBe("active");
    expect(audit.getAll()[0]?.action).toBe("enrollment.restored");
  });

  it("does not reactivate a refunded enrollment", async () => {
    const enrollment = createEnrollment({ id: "enrollment-1", userId, courseId, createdAt: now });
    if (!enrollment.ok) throw new Error("enrollment fixture failed");
    await enrollments.create(enrollment.value);
    await enrollments.update({ ...enrollment.value, status: "refunded" });

    const result = await useCase.execute({ userId, courseId, actorId, status: "active" });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("refunded_enrollment");
    expect(audit.getAll()).toHaveLength(0);
  });

  it("is idempotent when the requested status is already stored", async () => {
    const first = await useCase.execute({ userId, courseId, actorId, status: "active" });
    const second = await useCase.execute({ userId, courseId, actorId, status: "active" });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.changed).toBe(false);
    if (second.ok) expect(second.value.change).toBe("none");
    expect(audit.getAll()).toHaveLength(1);
  });

  it("fails closed when the user or course does not exist", async () => {
    const missingUser = await useCase.execute({
      userId: "missing",
      courseId,
      actorId,
      status: "active",
    });
    const missingCourse = await useCase.execute({
      userId,
      courseId: "missing",
      actorId,
      status: "active",
    });

    expect(missingUser).toEqual({ ok: false, error: { kind: "user_not_found" } });
    expect(missingCourse).toEqual({ ok: false, error: { kind: "course_not_found" } });
  });
});
