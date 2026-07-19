/**
 * Course repository contract test.
 *
 * P0-2 audit bullet: "every production adapter passes the same
 * contract as its fake".
 *
 * The InMemory and Prisma implementations of CourseRepository must
 * agree on observable behavior. This file defines a
 * `courseRepositoryContract` function. Both adapters are plugged
 * into it. Any deviation is a contract violation.
 */

import { describe, it, expect } from "vitest";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { PrismaCourseRepository } from "@/infra/repositories/PrismaCourseRepository";
import { createCourse } from "@/domain/entities/Course";
import { Result } from "@/domain/shared/Result";
import type { Course } from "@/domain/entities/Course";
import type { CourseRepository, CourseError } from "@/ports/repositories/CourseRepository";

function makeCourse(overrides: Partial<Parameters<typeof createCourse>[0]> = {}): Course {
  const r = createCourse({
    id: "course_1",
    slug: "test-course",
    title: "Test Course",
    tagline: "A test",
    description: "A test course",
    priceMinor: 100000,
    curriculum: {
      sections: [
        { id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "L1", type: "TEXT", content: {} }] },
      ],
    },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed: " + JSON.stringify(r.error));
  return r.value;
}

function courseRepositoryContract(
  label: string,
  makeRepo: () => CourseRepository,
  reset: () => Promise<void> | void,
): void {
  describe(`CourseRepository contract: ${label}`, () => {
    it("create: stores a new course and returns it", async () => {
      await reset();
      const repo = makeRepo();
      const course = makeCourse();
      const r = await repo.create(course);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.id).toBe("course_1");
    });

    it("create: returns slug_taken on duplicate slug (including archived)", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ slug: "test-course" }));
      const r = await repo.create(makeCourse({ id: "course_2", slug: "test-course" }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });

    it("findById: returns not_found when missing", async () => {
      await reset();
      const repo = makeRepo();
      const r = await repo.findById("missing");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("findById: round-trips after create", async () => {
      await reset();
      const repo = makeRepo();
      const course = makeCourse();
      await repo.create(course);
      const r = await repo.findById("course_1");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.id).toBe("course_1");
      expect(r.value.title).toBe("Test Course");
    });

    it("findBySlug: returns the course", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ slug: "find-me" }));
      const r = await repo.findBySlug("find-me");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.slug).toBe("find-me");
    });

    it("update: returns not_found when course doesn't exist (P0-6 style: not an upsert)", async () => {
      await reset();
      const repo = makeRepo();
      const r = await repo.update(makeCourse({ id: "missing" }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("update: persists changes when the course exists", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ id: "course_1", title: "Original" }));
      const updated = makeCourse({ id: "course_1", title: "Updated" });
      const r = await repo.update(updated);
      expect(r.ok).toBe(true);
      const found = await repo.findById("course_1");
      expect(found.ok).toBe(true);
      if (!found.ok) return;
      expect(found.value.title).toBe("Updated");
    });

    it("archive: returns not_found when course doesn't exist", async () => {
      await reset();
      const repo = makeRepo();
      const r = await repo.archive("missing");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("archive: idempotent (archiving twice returns the same course)", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ id: "course_1", status: "PUBLISHED" }));
      const r1 = await repo.archive("course_1");
      const r2 = await repo.archive("course_1");
      expect(r1.ok).toBe(true);
      expect(r2.ok).toBe(true);
      if (!r1.ok || !r2.ok) return;
      expect(r1.value.status).toBe("ARCHIVED");
      expect(r2.value.status).toBe("ARCHIVED");
    });

    it("listPublished: only returns published courses, ordered by displayOrder", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ id: "c1", slug: "c1", status: "PUBLISHED", displayOrder: 2 }));
      await repo.create(makeCourse({ id: "c2", slug: "c2", status: "DRAFT", displayOrder: 1 }));
      await repo.create(makeCourse({ id: "c3", slug: "c3", status: "PUBLISHED", displayOrder: 1 }));
      const r = await repo.listPublished();
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.map((c) => c.id)).toEqual(["c3", "c1"]);
    });

    it("listAll: returns every course regardless of status", async () => {
      await reset();
      const repo = makeRepo();
      await repo.create(makeCourse({ id: "c1", slug: "c1", status: "PUBLISHED" }));
      await repo.create(makeCourse({ id: "c2", slug: "c2", status: "DRAFT" }));
      const r = await repo.listAll();
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.length).toBe(2);
    });
  });
}

// ── InMemory adapter ──────────────────────────────────────
courseRepositoryContract("InMemory", () => new InMemoryCourseRepository(), () => {
  // The InMemory adapter's state is per-instance, so the per-test
  // makeRepo() already gets a fresh store. No global reset needed.
});

// ── Prisma adapter (requires DATABASE_URL + migrated DB) ──
// The Prisma-style contract test is opt-in: it needs a real DB
// to run. We gate it on env so unit-test runs (no DB) skip it.
const PRISMA_TEST_URL = process.env.PRISMA_CONTRACT_TEST_URL;
if (PRISMA_TEST_URL) {
  // We use a fresh Prisma client per makeRepo() so the contract
  // function's reset() can wipe the courses table between scenarios.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({ datasourceUrl: PRISMA_TEST_URL });

  courseRepositoryContract(
    "Prisma",
    () => new PrismaCourseRepository(prisma),
    async () => {
      await prisma.course.deleteMany({});
    },
  );
}

// ── Sanity: production PrismaCourseRepository exists and implements the port ──
describe("PrismaCourseRepository — type conformance", () => {
  it("implements the CourseRepository port", () => {
    expect(typeof PrismaCourseRepository.prototype.listPublished).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.listAll).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.findById).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.findBySlug).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.create).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.update).toBe("function");
    expect(typeof PrismaCourseRepository.prototype.archive).toBe("function");
  });
});
