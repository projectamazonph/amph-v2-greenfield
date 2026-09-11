/**
 * SubmitAssignment tests (P1-02).
 *
 * Pins: assignee submit with audit, stranger rejection, missing row,
 * and double-submit rejection.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createAssignment } from "@/domain/entities/Assignment";
import { SubmitAssignment } from "@/usecases/SubmitAssignment";
import { InMemoryAssignmentRepository } from "@/infra/repositories/inmemory/InMemoryAssignmentRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

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
  const useCase = new SubmitAssignment({ assignmentRepo, clock, recordAuditLog });

  async function seedPending(id = "assign-1") {
    const built = createAssignment({
      id,
      courseId: COURSE_ID,
      userId: STUDENT_ID,
      title: "Work",
      description: "Do it.",
      dueAt: new Date("2026-10-01T00:00:00Z"),
      createdById: "admin-1",
    });
    if (Result.isErr(built)) throw new Error("seed failed");
    const created = await assignmentRepo.create(built.value);
    if (Result.isErr(created)) throw new Error("seed failed");
  }

  return { auditLog, useCase, seedPending };
}

describe("SubmitAssignment", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  function audited(action: string): boolean {
    return deps.auditLog.getAll().some((entry) => entry.action === action);
  }

  it("flips the assignee's row to SUBMITTED and audits", async () => {
    await deps.seedPending();

    const result = await deps.useCase.execute({ userId: STUDENT_ID, assignmentId: "assign-1" });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.status).toBe("SUBMITTED");
      expect(result.value.submittedAt).toEqual(new Date("2026-09-11T00:00:00Z"));
    }
    expect(audited("assignment.submitted")).toBe(true);
  });

  it("rejects a stranger", async () => {
    await deps.seedPending();

    const result = await deps.useCase.execute({ userId: "student-2", assignmentId: "assign-1" });

    expect(result).toEqual(Result.err({ kind: "not_assignee" }));
    expect(audited("assignment.submit_failed")).toBe(true);
  });

  it("rejects a missing row", async () => {
    const result = await deps.useCase.execute({ userId: STUDENT_ID, assignmentId: "ghost" });

    expect(result).toEqual(Result.err({ kind: "assignment_not_found" }));
    expect(audited("assignment.submit_failed")).toBe(true);
  });

  it("rejects a second submission", async () => {
    await deps.seedPending();
    const first = await deps.useCase.execute({ userId: STUDENT_ID, assignmentId: "assign-1" });
    expect(Result.isOk(first)).toBe(true);

    const second = await deps.useCase.execute({ userId: STUDENT_ID, assignmentId: "assign-1" });

    expect(second).toEqual(Result.err({ kind: "invalid_status" }));
  });
});
