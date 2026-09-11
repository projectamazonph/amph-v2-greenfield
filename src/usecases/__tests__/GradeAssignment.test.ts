/**
 * GradeAssignment tests (P1-02).
 *
 * Pins: happy-path grade with audit, unsubmitted rejection, grade
 * range rejection, missing row, and the grader stamp.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createAssignment, submitAssignment } from "@/domain/entities/Assignment";
import { GradeAssignment } from "@/usecases/GradeAssignment";
import { InMemoryAssignmentRepository } from "@/infra/repositories/inmemory/InMemoryAssignmentRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

const ADMIN_ID = "admin-1";
const STUDENT_ID = "student-1";
const COURSE_ID = "course-a";

async function makeDeps() {
  const assignmentRepo = new InMemoryAssignmentRepository();
  const auditLog = new InMemoryAuditLog();
  const clock = new FixedClock(new Date("2026-09-11T00:00:00Z"));
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock,
    logger: new SilentLogger(),
  });
  const useCase = new GradeAssignment({ assignmentRepo, clock, recordAuditLog });

  async function seed(id: string, submitted: boolean) {
    const built = createAssignment({
      id,
      courseId: COURSE_ID,
      userId: STUDENT_ID,
      title: "Work",
      description: "Do it.",
      dueAt: new Date("2026-10-01T00:00:00Z"),
      createdById: ADMIN_ID,
    });
    if (Result.isErr(built)) throw new Error("seed failed");
    const row = submitted
      ? submitAssignment(built.value, {
          submittedById: STUDENT_ID,
          submittedAt: new Date("2026-09-20T00:00:00Z"),
        })
      : built;
    if (Result.isErr(row)) throw new Error("seed failed");
    const created = await assignmentRepo.create(row.value);
    if (Result.isErr(created)) throw new Error("seed failed");
  }

  return { auditLog, useCase, seed };
}

describe("GradeAssignment", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  function audited(action: string): boolean {
    return deps.auditLog.getAll().some((entry) => entry.action === action);
  }

  it("grades a SUBMITTED row and stamps the grader", async () => {
    await deps.seed("assign-1", true);

    const result = await deps.useCase.execute({
      actorId: ADMIN_ID,
      assignmentId: "assign-1",
      grade: 85,
      feedback: "Solid audit.",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("GRADED");
      expect(result.value.grade).toBe(85);
      expect(result.value.graderId).toBe(ADMIN_ID);
      expect(result.value.feedback).toBe("Solid audit.");
    }
    expect(audited("assignment.graded")).toBe(true);
  });

  it("rejects grading without a submission", async () => {
    await deps.seed("assign-pending", false);

    const result = await deps.useCase.execute({
      actorId: ADMIN_ID,
      assignmentId: "assign-pending",
      grade: 90,
      feedback: null,
    });

    expect(result).toEqual(Result.err({ kind: "invalid_status" }));
    expect(audited("assignment.grade_failed")).toBe(true);
  });

  it("rejects an out-of-range grade", async () => {
    await deps.seed("assign-1", true);

    const result = await deps.useCase.execute({
      actorId: ADMIN_ID,
      assignmentId: "assign-1",
      grade: 101,
      feedback: null,
    });

    expect(result).toEqual(Result.err({ kind: "invalid_grade" }));
  });

  it("rejects a missing row", async () => {
    const result = await deps.useCase.execute({
      actorId: ADMIN_ID,
      assignmentId: "ghost",
      grade: 80,
      feedback: null,
    });

    expect(result).toEqual(Result.err({ kind: "assignment_not_found" }));
  });
});
