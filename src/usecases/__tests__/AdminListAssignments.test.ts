/**
 * AdminListAssignments tests (P1-02).
 *
 * Pins: cross-student pagination and status filtering.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createAssignment, submitAssignment } from "@/domain/entities/Assignment";
import { AdminListAssignments } from "@/usecases/AdminListAssignments";
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

  const useCase = new AdminListAssignments({ assignmentRepo });
  return { useCase, seed };
}

describe("AdminListAssignments", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  it("pages across students with filters", async () => {
    await deps.seed("a1", false);
    await deps.seed("a2", true);

    const page = await deps.useCase.execute({ page: 1, pageSize: 1 });

    expect(Result.isOk(page)).toBe(true);
    if (Result.isErr(page)) return;
    expect(page.value.totalCount).toBe(2);
    expect(page.value.rows).toHaveLength(1);

    const submitted = await deps.useCase.execute({ status: "SUBMITTED" });
    if (Result.isErr(submitted)) throw new Error("expected ok");
    expect(submitted.value.rows.map((row) => row.id)).toEqual(["a2"]);
  });
});
