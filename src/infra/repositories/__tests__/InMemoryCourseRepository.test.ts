/**
 * InMemoryCourseRepository.test.ts — STORY-048a.
 *
 * Tier B coverage for the InMemoryCourseRepository's new CRUD methods:
 *   - create()
 *   - update()
 *   - archive()
 *
 * The listPublished / listAll / findById / findBySlug methods are
 * already exercised indirectly by other use case tests; we focus on
 * the 3 new methods here.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryCourseRepository } from "@/infra/repositories/InMemoryCourseRepository";
import { createCourse, type Course } from "@/domain/entities/Course";

function makeCourse(overrides: Partial<Course> = {}): Course {
  const r = createCourse({
    id: `course_${Math.random().toString(36).slice(2, 8)}`,
    slug: `slug-${Math.random().toString(36).slice(2, 8)}`,
    title: "Test Course",
    tagline: "Tagline",
    description: "Description",
    priceMinor: 1000,
    curriculum: { sections: [{ id: "s1", title: "Section 1", lessons: [{ id: "l1", title: "Lesson 1", type: "TEXT", content: "" }] }] },
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("InMemoryCourseRepository — CRUD", () => {
  let repo: InMemoryCourseRepository;

  beforeEach(() => {
    repo = new InMemoryCourseRepository();
  });

  // ── create() ─────────────────────────────────────────

  describe("create", () => {
    it("persists a new course", async () => {
      const c = makeCourse({ id: "c1", slug: "alpha" });
      const r = await repo.create(c);

      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.id).toBe("c1");

      const persisted = await repo.findById("c1");
      expect(persisted.ok).toBe(true);
    });

    it("returns slug_taken when another course has the same slug", async () => {
      await repo.create(makeCourse({ id: "c1", slug: "alpha" }));
      const r = await repo.create(makeCourse({ id: "c2", slug: "alpha" }));

      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });

    it("returns slug_taken even when the existing course is ARCHIVED", async () => {
      const existing = makeCourse({ id: "c1", slug: "alpha" });
      await repo.create({ ...existing, status: "ARCHIVED" });

      const r = await repo.create(makeCourse({ id: "c2", slug: "alpha" }));

      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });
  });

  // ── update() ─────────────────────────────────────────

  describe("update", () => {
    it("updates an existing course", async () => {
      await repo.create(makeCourse({ id: "c1", slug: "alpha" }));

      const r = await repo.update(makeCourse({ id: "c1", slug: "alpha", title: "New Title" }));
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe("New Title");
    });

    it("returns not_found when the id doesn't exist", async () => {
      const r = await repo.update(makeCourse({ id: "missing", slug: "alpha" }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("returns slug_taken when the new slug collides with another course", async () => {
      await repo.create(makeCourse({ id: "c1", slug: "alpha" }));
      await repo.create(makeCourse({ id: "c2", slug: "beta" }));

      const r = await repo.update(makeCourse({ id: "c1", slug: "beta" }));
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("slug_taken");
    });

    it("allows keeping the same slug (no self-collision)", async () => {
      await repo.create(makeCourse({ id: "c1", slug: "alpha" }));
      const r = await repo.update(makeCourse({ id: "c1", slug: "alpha", title: "Updated" }));
      expect(r.ok).toBe(true);
    });
  });

  // ── archive() ────────────────────────────────────────

  describe("archive", () => {
    it("archives a DRAFT course (sets status=ARCHIVED)", async () => {
      await repo.create(makeCourse({ id: "c1", status: "DRAFT" }));
      const r = await repo.archive("c1");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.status).toBe("ARCHIVED");
    });

    it("archives a PUBLISHED course", async () => {
      await repo.create(makeCourse({ id: "c1", status: "PUBLISHED" }));
      const r = await repo.archive("c1");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.status).toBe("ARCHIVED");
    });

    it("is idempotent on an already-ARCHIVED course", async () => {
      await repo.create(makeCourse({ id: "c1", status: "ARCHIVED" }));
      const r = await repo.archive("c1");
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.status).toBe("ARCHIVED");
    });

    it("returns not_found when the id doesn't exist", async () => {
      const r = await repo.archive("missing");
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("not_found");
    });

    it("persists the archived status in the repo", async () => {
      await repo.create(makeCourse({ id: "c1", status: "PUBLISHED" }));
      await repo.archive("c1");
      const persisted = await repo.findById("c1");
      expect(persisted.ok).toBe(true);
      if (!persisted.ok) return;
      expect(persisted.value.status).toBe("ARCHIVED");
    });
  });
});
