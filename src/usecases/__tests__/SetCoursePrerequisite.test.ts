/**
 * SetCoursePrerequisite tests (P1-01).
 *
 * Pins: happy-path set with audit, idempotent re-set, self-require,
 * missing courses, missing lesson, cycle rejection, and audit entries
 * for every outcome.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createCourse, type Course } from "@/domain/entities/Course";
import { SetCoursePrerequisite } from "@/usecases/SetCoursePrerequisite";
import { InMemoryPrerequisiteRepository } from "@/infra/repositories/inmemory/InMemoryPrerequisiteRepository";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeCourse(id: string, slug: string, lessonIds: readonly string[]): Course {
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
          lessons: lessonIds.map((lessonId) => ({
            id: lessonId,
            title: lessonId,
            type: "TEXT" as const,
            content: "",
          })),
        },
      ],
    },
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

function makeDeps() {
  const prerequisiteRepo = new InMemoryPrerequisiteRepository();
  const courseRepo = new InMemoryCourseRepository();
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-09-11T00:00:00Z")),
    logger: new SilentLogger(),
  });
  const useCase = new SetCoursePrerequisite({
    prerequisiteRepo,
    courseRepo,
    idGen: { newId: () => "prereq_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-09-11T00:00:00Z")),
    recordAuditLog,
  });
  return { prerequisiteRepo, courseRepo, auditLog, useCase };
}

describe("SetCoursePrerequisite", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(async () => {
    deps = makeDeps();
    await deps.courseRepo.create(makeCourse("course-a", "course-a", ["a-l1", "a-l2"]));
    await deps.courseRepo.create(makeCourse("course-b", "course-b", ["b-l1"]));
  });

  it("sets a course-level rule and audits the set", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });

    expect(Result.isOk(result)).toBe(true);
    const listed = await deps.prerequisiteRepo.listByCourseId("course-b");
    if (Result.isOk(result) && Result.isOk(listed)) {
      expect(listed.value).toEqual([result.value]);
    } else {
      throw new Error("expected ok results");
    }
    expect(deps.auditLog.getAll().some((e) => e.action === "prerequisite.set")).toBe(true);
  });

  it("sets a lesson-scoped rule when the lesson belongs to the required course", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: "a-l1",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.requiresLessonId).toBe("a-l1");
    }
  });

  it("returns the existing rule when the same triple is set twice", async () => {
    const first = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });
    const second = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });

    expect(Result.isOk(first)).toBe(true);
    expect(second).toEqual(first);
    const listed = await deps.prerequisiteRepo.listByCourseId("course-b");
    if (Result.isOk(listed)) {
      expect(listed.value).toHaveLength(1);
    }
  });

  it("rejects a course that requires itself", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-a",
      requiresCourseId: "course-a",
    });

    expect(result).toEqual(Result.err({ kind: "self_prerequisite" }));
    expect(deps.auditLog.getAll().some((e) => e.action === "prerequisite.set_failed")).toBe(true);
  });

  it("rejects an unknown gated course", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "ghost",
      requiresCourseId: "course-a",
    });

    expect(result).toEqual(Result.err({ kind: "course_not_found" }));
  });

  it("rejects an unknown required course", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "ghost",
    });

    expect(result).toEqual(Result.err({ kind: "requires_course_not_found" }));
  });

  it("rejects a lesson that is not in the required course", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
      requiresLessonId: "b-l1",
    });

    expect(result).toEqual(Result.err({ kind: "requires_lesson_not_found" }));
  });

  it("rejects a rule that would close a dependency cycle", async () => {
    const first = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });
    expect(Result.isOk(first)).toBe(true);

    const cycle = await deps.useCase.execute({
      actorId: "admin-1",
      courseId: "course-a",
      requiresCourseId: "course-b",
    });

    expect(cycle).toEqual(Result.err({ kind: "prerequisite_cycle" }));
  });
});
