/**
 * InMemoryAssignmentRepository contract pins (P1-02).
 *
 * The fake must honor the same postconditions as the Prisma
 * adapter: id uniqueness, soft-delete invisibility, newest-due
 * ordering, filters, and 1-based pagination.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createAssignment, type Assignment } from "@/domain/entities/Assignment";
import { InMemoryAssignmentRepository } from "@/infra/repositories/inmemory/InMemoryAssignmentRepository";

function mustCreate(params: {
  id: string;
  userId?: string;
  courseId?: string;
  dueAt?: Date;
}): Assignment {
  const result = createAssignment({
    id: params.id,
    courseId: params.courseId ?? "course-a",
    userId: params.userId ?? "student-1",
    title: `Work ${params.id}`,
    description: "Do the work.",
    dueAt: params.dueAt ?? new Date("2026-10-01T00:00:00Z"),
    createdById: "admin-1",
  });
  if (Result.isErr(result)) throw new Error("test setup failed");
  return result.value;
}

describe("InMemoryAssignmentRepository", () => {
  it("round-trips a row through create and findById", async () => {
    const repo = new InMemoryAssignmentRepository();
    const assignment = mustCreate({ id: "a1" });

    expect(await repo.create(assignment)).toEqual(Result.ok(assignment));
    expect(await repo.findById("a1")).toEqual(Result.ok(assignment));
    expect(await repo.findById("ghost")).toEqual(Result.ok(null));
  });

  it("rejects a duplicate id on create", async () => {
    const repo = new InMemoryAssignmentRepository();
    await repo.create(mustCreate({ id: "a1" }));

    const duplicate = await repo.create(mustCreate({ id: "a1" }));

    expect(Result.isErr(duplicate)).toBe(true);
  });

  it("hides soft-deleted rows from every read", async () => {
    const repo = new InMemoryAssignmentRepository();
    const assignment = mustCreate({ id: "a1" });
    await repo.create(assignment);
    await repo.update({ ...assignment, deletedAt: new Date() });

    expect(await repo.findById("a1")).toEqual(Result.ok(null));
    expect(await repo.listByUser("student-1")).toEqual(Result.ok([]));
    const paged = await repo.listAll();
    if (Result.isErr(paged)) throw new Error("expected ok");
    expect(paged.value.totalCount).toBe(0);
  });

  it("lists a student's rows newest-due-first with filters", async () => {
    const repo = new InMemoryAssignmentRepository();
    await repo.create(mustCreate({ id: "a1", dueAt: new Date("2026-10-01T00:00:00Z") }));
    await repo.create(mustCreate({ id: "a2", dueAt: new Date("2026-11-01T00:00:00Z") }));
    await repo.create(
      mustCreate({ id: "a3", userId: "student-2", dueAt: new Date("2026-12-01T00:00:00Z") }),
    );

    const all = await repo.listByUser("student-1");
    if (Result.isErr(all)) throw new Error("expected ok");
    expect(all.value.map((row) => row.id)).toEqual(["a2", "a1"]);

    const byCourse = await repo.listByUser("student-1", { courseId: "other" });
    expect(byCourse).toEqual(Result.ok([]));
  });

  it("paginates the admin list 1-based", async () => {
    const repo = new InMemoryAssignmentRepository();
    for (let i = 1; i <= 3; i++) {
      await repo.create(
        mustCreate({ id: `a${i}`, dueAt: new Date(`2026-10-0${i}T00:00:00Z`) }),
      );
    }

    const first = await repo.listAll({ page: 1, pageSize: 2 });
    if (Result.isErr(first)) throw new Error("expected ok");
    expect(first.value.rows.map((row) => row.id)).toEqual(["a3", "a2"]);
    expect(first.value.totalCount).toBe(3);
    expect(first.value.page).toBe(1);

    const second = await repo.listAll({ page: 2, pageSize: 2 });
    if (Result.isErr(second)) throw new Error("expected ok");
    expect(second.value.rows.map((row) => row.id)).toEqual(["a1"]);
  });

  it("returns not_found when updating a missing id", async () => {
    const repo = new InMemoryAssignmentRepository();

    expect(await repo.update(mustCreate({ id: "ghost" }))).toEqual(
      Result.err({ kind: "not_found" }),
    );
  });

  it("searches the admin list by title substring", async () => {
    const repo = new InMemoryAssignmentRepository();
    await repo.create(mustCreate({ id: "a1" }));
    await repo.create({ ...mustCreate({ id: "a2" }), title: "Unrelated work" });

    const found = await repo.listAll({ search: "work a1" });
    if (Result.isErr(found)) throw new Error("expected ok");
    expect(found.value.rows.map((row) => row.id)).toEqual(["a1"]);
  });
});
