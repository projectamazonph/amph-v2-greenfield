/**
 * InMemoryPrerequisiteRepository contract pins (P1-01).
 *
 * The fake must honor the same postconditions as the Prisma adapter:
 * triple uniqueness, soft-delete invisibility, creation-order listing.
 */

import { describe, expect, it } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createPrerequisite, type Prerequisite } from "@/domain/entities/Prerequisite";
import { InMemoryPrerequisiteRepository } from "@/infra/repositories/inmemory/InMemoryPrerequisiteRepository";

function mustCreate(params: {
  id: string;
  courseId: string;
  requiresCourseId: string;
  requiresLessonId?: string | null;
  createdAt?: Date;
}): Prerequisite {
  const result = createPrerequisite({
    id: params.id,
    courseId: params.courseId,
    requiresCourseId: params.requiresCourseId,
    requiresLessonId: params.requiresLessonId ?? null,
    createdById: "admin-1",
    createdAt: params.createdAt,
  });
  if (Result.isErr(result)) throw new Error("test setup failed");
  return result.value;
}

describe("InMemoryPrerequisiteRepository", () => {
  it("round-trips a rule through create and findRule", async () => {
    const repo = new InMemoryPrerequisiteRepository();
    const prereq = mustCreate({ id: "p1", courseId: "b", requiresCourseId: "a" });

    const created = await repo.create(prereq);
    expect(Result.isOk(created)).toBe(true);

    const found = await repo.findRule("b", "a", null);
    expect(found).toEqual(Result.ok(prereq));
  });

  it("rejects a duplicate triple on create", async () => {
    const repo = new InMemoryPrerequisiteRepository();
    await repo.create(mustCreate({ id: "p1", courseId: "b", requiresCourseId: "a" }));

    const duplicate = await repo.create(
      mustCreate({ id: "p2", courseId: "b", requiresCourseId: "a" }),
    );

    expect(Result.isErr(duplicate)).toBe(true);
    if (Result.isErr(duplicate)) {
      expect(duplicate.error.kind).toBe("db_error");
    }
  });

  it("treats lesson-scoped and course-scoped triples as distinct", async () => {
    const repo = new InMemoryPrerequisiteRepository();
    await repo.create(mustCreate({ id: "p1", courseId: "b", requiresCourseId: "a" }));
    const lessonScoped = await repo.create(
      mustCreate({ id: "p2", courseId: "b", requiresCourseId: "a", requiresLessonId: "l1" }),
    );

    expect(Result.isOk(lessonScoped)).toBe(true);
  });

  it("hides soft-deleted rows from findRule and listByCourseId", async () => {
    const repo = new InMemoryPrerequisiteRepository();
    const prereq = mustCreate({ id: "p1", courseId: "b", requiresCourseId: "a" });
    await repo.create(prereq);
    await repo.update({ ...prereq, deletedAt: new Date(), updatedById: "admin-2" });

    expect(await repo.findRule("b", "a", null)).toEqual(Result.ok(null));
    expect(await repo.listByCourseId("b")).toEqual(Result.ok([]));
  });

  it("lists live rules in creation order", async () => {
    const repo = new InMemoryPrerequisiteRepository();
    const first = mustCreate({
      id: "p1",
      courseId: "b",
      requiresCourseId: "a",
      createdAt: new Date("2026-09-11T00:00:00Z"),
    });
    const second = mustCreate({
      id: "p2",
      courseId: "b",
      requiresCourseId: "c",
      createdAt: new Date("2026-09-11T00:00:01Z"),
    });
    await repo.create(second);
    await repo.create(first);

    const listed = await repo.listByCourseId("b");

    expect(listed).toEqual(Result.ok([first, second]));
  });

  it("returns not_found when updating a missing id", async () => {
    const repo = new InMemoryPrerequisiteRepository();

    const updated = await repo.update(
      mustCreate({ id: "ghost", courseId: "b", requiresCourseId: "a" }),
    );

    expect(updated).toEqual(Result.err({ kind: "not_found" }));
  });
});
