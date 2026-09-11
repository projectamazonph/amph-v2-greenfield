/**
 * CreateAssignment tests (P1-02).
 *
 * Pins: happy-path create with audit, assignee and course existence
 * checks, domain validation passthrough, and failure audits.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createCourse, type Course } from "@/domain/entities/Course";
import { CreateAssignment } from "@/usecases/CreateAssignment";
import { InMemoryAssignmentRepository } from "@/infra/repositories/inmemory/InMemoryAssignmentRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryUserRepository } from "@/infra/repositories/InMemoryUserRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

const ADMIN_ID = "admin-1";
const COURSE_ID = "course-a";
const STUDENT_EMAIL = "student@example.com";

function makeCourse(id: string, slug: string): Course {
  const r = createCourse({
    id,
    slug,
    title: `Course ${id}`,
    tagline: "Tagline",
    description: "Description",
    priceMinor: 0,
    curriculum: {
      sections: [
        {
          id: `${id}-s1`,
          title: "Section 1",
          lessons: [{ id: `${id}-l1`, title: "Lesson 1", type: "TEXT" as const, content: "" }],
        },
      ],
    },
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

async function makeDeps() {
  const assignmentRepo = new InMemoryAssignmentRepository();
  const courseRepo = new InMemoryCourseRepository();
  const userRepo = new InMemoryUserRepository();
  const auditLog = new InMemoryAuditLog();
  const clock = new FixedClock(new Date("2026-09-11T00:00:00Z"));
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock,
    logger: new SilentLogger(),
  });
  await userRepo.create({
    id: "student-1",
    email: STUDENT_EMAIL,
    passwordHash: "hash",
    firstName: "Student",
    lastName: "One",
  });
  await courseRepo.create(makeCourse(COURSE_ID, "course-a"));
  const useCase = new CreateAssignment({
    assignmentRepo,
    userRepo,
    courseRepo,
    idGen: { newId: () => "assign_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock,
    recordAuditLog,
  });
  return { auditLog, useCase };
}

describe("CreateAssignment", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  function input() {
    return {
      actorId: ADMIN_ID,
      courseId: COURSE_ID,
      userEmail: STUDENT_EMAIL,
      title: "Audit a listing",
      description: "Run the audit on your practice ASIN.",
      dueAt: new Date("2026-10-01T00:00:00Z"),
    };
  }

  function audited(action: string): boolean {
    return deps.auditLog.getAll().some((entry) => entry.action === action);
  }

  it("creates a PENDING assignment and audits the create", async () => {
    const result = await deps.useCase.execute(input());

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("PENDING");
      expect(result.value.userId).toBe("student-1");
      expect(result.value.createdById).toBe(ADMIN_ID);
    }
    expect(audited("assignment.created")).toBe(true);
  });

  it("rejects an unknown assignee", async () => {
    const result = await deps.useCase.execute({ ...input(), userEmail: "ghost@example.com" });

    expect(result).toEqual(Result.err({ kind: "user_not_found" }));
    expect(audited("assignment.create_failed")).toBe(true);
  });

  it("rejects an unknown course", async () => {
    const result = await deps.useCase.execute({ ...input(), courseId: "ghost" });

    expect(result).toEqual(Result.err({ kind: "course_not_found" }));
    expect(audited("assignment.create_failed")).toBe(true);
  });

  it("rejects a blank title through domain validation", async () => {
    const result = await deps.useCase.execute({ ...input(), title: "  " });

    expect(result).toEqual(Result.err({ kind: "invalid_title" }));
    expect(audited("assignment.create_failed")).toBe(true);
  });
});
