/**
 * RemoveCoursePrerequisite tests (P1-01).
 *
 * Pins: soft-delete remove with audit, and prerequisite_not_found
 * (also audited) when no live rule matches.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { createCourse, type Course } from "@/domain/entities/Course";
import { SetCoursePrerequisite } from "@/usecases/SetCoursePrerequisite";
import { RemoveCoursePrerequisite } from "@/usecases/RemoveCoursePrerequisite";
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
  const set = new SetCoursePrerequisite({
    prerequisiteRepo,
    courseRepo,
    idGen: { newId: () => "prereq_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-09-11T00:00:00Z")),
    recordAuditLog,
  });
  const remove = new RemoveCoursePrerequisite({
    prerequisiteRepo,
    clock: new FixedClock(new Date("2026-09-12T00:00:00Z")),
    recordAuditLog,
  });
  return { prerequisiteRepo, courseRepo, auditLog, set, remove };
}

describe("RemoveCoursePrerequisite", () => {
  let deps: ReturnType<typeof makeDeps>;

  beforeEach(async () => {
    deps = makeDeps();
    await deps.courseRepo.create(makeCourse("course-a", "course-a", ["a-l1", "a-l2"]));
    await deps.courseRepo.create(makeCourse("course-b", "course-b", ["b-l1"]));
  });

  it("soft-deletes a live rule and audits the removal", async () => {
    await deps.set.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });

    const removed = await deps.remove.execute({
      actorId: "admin-2",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });

    expect(Result.isOk(removed)).toBe(true);
    if (Result.isOk(removed)) {
      expect(removed.value.deletedAt).not.toBeNull();
      expect(removed.value.updatedById).toBe("admin-2");
    }
    expect(await deps.prerequisiteRepo.listByCourseId("course-b")).toEqual(Result.ok([]));
    expect(deps.auditLog.getAll().some((e) => e.action === "prerequisite.removed")).toBe(true);
  });

  it("returns prerequisite_not_found when no live rule matches", async () => {
    const removed = await deps.remove.execute({
      actorId: "admin-1",
      courseId: "course-b",
      requiresCourseId: "course-a",
    });

    expect(removed).toEqual(Result.err({ kind: "prerequisite_not_found" }));
    expect(deps.auditLog.getAll().some((e) => e.action === "prerequisite.remove_failed")).toBe(true);
  });
});
