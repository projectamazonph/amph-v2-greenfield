/**
 * ListStudentAssignments tests (P1-02).
 *
 * Pins: per-student scoping and the derived overdue flag.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { FixedClock } from "@/ports/system/Clock";
import { createAssignment, submitAssignment } from "@/domain/entities/Assignment";
import { ListStudentAssignments } from "@/usecases/ListStudentAssignments";
import { InMemoryAssignmentRepository } from "@/infra/repositories/inmemory/InMemoryAssignmentRepository";

const STUDENT_ID = "student-1";
const COURSE_ID = "course-a";

async function makeDeps() {
  const assignmentRepo = new InMemoryAssignmentRepository();

  async function seed(id: string, submitted: boolean) {
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

  return { assignmentRepo, seed };
}

describe("ListStudentAssignments", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  it("returns only the student's rows", async () => {
    await deps.seed("a1", false);
    await deps.seed("a2", true);
    const useCase = new ListStudentAssignments({
      assignmentRepo: deps.assignmentRepo,
      clock: new FixedClock(new Date("2026-09-11T00:00:00Z")),
    });

    const result = await useCase.execute({ userId: STUDENT_ID });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    // Harness clock is 2026-09-11, before the 2026-10-01 due date,
    // so nothing is overdue yet.
    expect(result.value.rows).toHaveLength(2);
    expect(result.value.rows.every((row) => row.overdue === false)).toBe(true);
  });

  it("flags past-due PENDING rows as overdue", async () => {
    await deps.seed("a1", false);
    const useCase = new ListStudentAssignments({
      assignmentRepo: deps.assignmentRepo,
      clock: new FixedClock(new Date("2026-11-01T00:00:00Z")),
    });

    const result = await useCase.execute({ userId: STUDENT_ID });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isErr(result)) return;
    expect(result.value.rows.find((row) => row.assignment.id === "a1")?.overdue).toBe(true);
  });

  it("scopes rows to the requesting student", async () => {
    await deps.seed("a1", false);
    const useCase = new ListStudentAssignments({
      assignmentRepo: deps.assignmentRepo,
      clock: new FixedClock(new Date("2026-09-11T00:00:00Z")),
    });

    const result = await useCase.execute({ userId: "student-2" });

    expect(result).toEqual(Result.ok({ rows: [] }));
  });
});
