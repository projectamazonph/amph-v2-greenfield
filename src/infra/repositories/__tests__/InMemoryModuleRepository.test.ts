/**
 * InMemoryModuleRepository.test.ts — STORY-048b.
 *
 * Tier B #2 closure: tests for the IModuleRepository port's
 * in-memory implementation. Covers every port method including
 * the atomic reorder validation.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { createModule, type Module } from "@/domain/entities/Module";

function makeModule(overrides: Partial<Module> = {}): Module {
  const r = createModule({
    id: `mod_${Math.random().toString(36).slice(2, 8)}`,
    courseId: "course_01",
    title: "Test Module",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("InMemoryModuleRepository", () => {
  let repo: InMemoryModuleRepository;

  beforeEach(() => {
    repo = new InMemoryModuleRepository();
  });

  // ── findByCourseId ──────────────────────────────────

  it("returns empty list when the course has no modules", async () => {
    const r = await repo.findByCourseId("course_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });

  it("returns modules for the course, sorted by displayOrder", async () => {
    await repo.create(makeModule({ id: "m1", displayOrder: 2 }));
    await repo.create(makeModule({ id: "m2", displayOrder: 1 }));
    await repo.create(makeModule({ id: "m3", displayOrder: 3 }));

    const r = await repo.findByCourseId("course_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((m) => m.id)).toEqual(["m2", "m1", "m3"]);
  });

  it("does not return modules from other courses", async () => {
    await repo.create(makeModule({ id: "m1", courseId: "course_01" }));
    await repo.create(makeModule({ id: "m2", courseId: "course_02" }));

    const r = await repo.findByCourseId("course_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((m) => m.id)).toEqual(["m1"]);
  });

  // ── findById ────────────────────────────────────────

  it("finds a module by id", async () => {
    const m = makeModule({ id: "m1" });
    await repo.create(m);

    const r = await repo.findById("m1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("m1");
  });

  it("returns not_found when the id doesn't exist", async () => {
    const r = await repo.findById("missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── create ──────────────────────────────────────────

  it("creates a module", async () => {
    const m = makeModule({ id: "m1" });
    const r = await repo.create(m);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("m1");
  });

  // ── update ──────────────────────────────────────────

  it("updates a module", async () => {
    const m = makeModule({ id: "m1", title: "Old" });
    await repo.create(m);

    const r = await repo.update({ ...m, title: "New" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("New");
  });

  it("returns not_found when updating a non-existent module", async () => {
    const m = makeModule({ id: "missing" });
    const r = await repo.update(m);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── delete ──────────────────────────────────────────

  it("deletes a module", async () => {
    const m = makeModule({ id: "m1" });
    await repo.create(m);

    const r = await repo.delete("m1");
    expect(r.ok).toBe(true);

    const find = await repo.findById("m1");
    expect(find.ok).toBe(false);
    if (find.ok) return;
    expect(find.error.kind).toBe("not_found");
  });

  it("returns not_found when deleting a non-existent module", async () => {
    const r = await repo.delete("missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── reorder ─────────────────────────────────────────

  it("reorders modules atomically and assigns sequential displayOrder", async () => {
    await repo.create(makeModule({ id: "m1", displayOrder: 1 }));
    await repo.create(makeModule({ id: "m2", displayOrder: 2 }));
    await repo.create(makeModule({ id: "m3", displayOrder: 3 }));

    const r = await repo.reorder("course_01", ["m3", "m1", "m2"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
    expect(r.value.map((m) => m.displayOrder)).toEqual([1, 2, 3]);

    // And the change is persisted
    const list = await repo.findByCourseId("course_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });

  it("rejects reorder when a current module is missing from the input", async () => {
    await repo.create(makeModule({ id: "m1" }));
    await repo.create(makeModule({ id: "m2" }));

    const r = await repo.reorder("course_01", ["m1"]); // m2 missing
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("rejects reorder when the input has an extra id", async () => {
    await repo.create(makeModule({ id: "m1" }));

    const r = await repo.reorder("course_01", ["m1", "m2"]); // m2 doesn't exist
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("rejects reorder when an input id belongs to a different course", async () => {
    await repo.create(makeModule({ id: "m1", courseId: "course_01" }));
    await repo.create(makeModule({ id: "m2", courseId: "course_02" }));

    const r = await repo.reorder("course_01", ["m1", "m2"]); // m2 is course_02
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("rejects reorder when the current course has no modules but the input has ids", async () => {
    const r = await repo.reorder("course_01", ["m1"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("accepts reorder with empty list when the current course has no modules", async () => {
    const r = await repo.reorder("course_01", []);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });
});
