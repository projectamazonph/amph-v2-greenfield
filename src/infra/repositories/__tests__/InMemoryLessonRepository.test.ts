/**
 * InMemoryLessonRepository.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const r = createLesson({
    id: `les_${Math.random().toString(36).slice(2, 8)}`,
    moduleId: "mod_01",
    title: "Test Lesson",
    type: "TEXT",
    content: { body: "hello" },
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("InMemoryLessonRepository", () => {
  let repo: InMemoryLessonRepository;

  beforeEach(() => {
    repo = new InMemoryLessonRepository();
  });

  // ── findByModuleId ──────────────────────────────────

  it("returns empty list when the module has no lessons", async () => {
    const r = await repo.findByModuleId("mod_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });

  it("returns lessons for the module, sorted by displayOrder", async () => {
    await repo.create(makeLesson({ id: "l1", displayOrder: 2 }));
    await repo.create(makeLesson({ id: "l2", displayOrder: 1 }));
    await repo.create(makeLesson({ id: "l3", displayOrder: 3 }));

    const r = await repo.findByModuleId("mod_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((l) => l.id)).toEqual(["l2", "l1", "l3"]);
  });

  it("does not return lessons from other modules", async () => {
    await repo.create(makeLesson({ id: "l1", moduleId: "mod_01" }));
    await repo.create(makeLesson({ id: "l2", moduleId: "mod_02" }));

    const r = await repo.findByModuleId("mod_01");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((l) => l.id)).toEqual(["l1"]);
  });

  // ── findById ────────────────────────────────────────

  it("finds a lesson by id", async () => {
    const l = makeLesson({ id: "l1" });
    await repo.create(l);

    const r = await repo.findById("l1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("l1");
  });

  it("returns not_found when the id doesn't exist", async () => {
    const r = await repo.findById("missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── create ──────────────────────────────────────────

  it("creates a lesson", async () => {
    const l = makeLesson({ id: "l1" });
    const r = await repo.create(l);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("l1");
  });

  // ── update ──────────────────────────────────────────

  it("updates a lesson", async () => {
    const l = makeLesson({ id: "l1", title: "Old" });
    await repo.create(l);

    const r = await repo.update({ ...l, title: "New" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("New");
  });

  it("returns not_found when updating a non-existent lesson", async () => {
    const l = makeLesson({ id: "missing" });
    const r = await repo.update(l);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── delete ──────────────────────────────────────────

  it("deletes a lesson", async () => {
    const l = makeLesson({ id: "l1" });
    await repo.create(l);

    const r = await repo.delete("l1");
    expect(r.ok).toBe(true);

    const find = await repo.findById("l1");
    expect(find.ok).toBe(false);
  });

  it("returns not_found when deleting a non-existent lesson", async () => {
    const r = await repo.delete("missing");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  // ── reorder ─────────────────────────────────────────

  it("reorders lessons atomically and assigns sequential displayOrder", async () => {
    await repo.create(makeLesson({ id: "l1", displayOrder: 1 }));
    await repo.create(makeLesson({ id: "l2", displayOrder: 2 }));
    await repo.create(makeLesson({ id: "l3", displayOrder: 3 }));

    const r = await repo.reorder("mod_01", ["l3", "l1", "l2"]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
    expect(r.value.map((l) => l.displayOrder)).toEqual([1, 2, 3]);
  });

  it("rejects reorder when a current lesson is missing from the input", async () => {
    await repo.create(makeLesson({ id: "l1" }));
    await repo.create(makeLesson({ id: "l2" }));

    const r = await repo.reorder("mod_01", ["l1"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("rejects reorder when an input id belongs to a different module", async () => {
    await repo.create(makeLesson({ id: "l1", moduleId: "mod_01" }));
    await repo.create(makeLesson({ id: "l2", moduleId: "mod_02" }));

    const r = await repo.reorder("mod_01", ["l1", "l2"]);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("accepts reorder with empty list when the module has no lessons", async () => {
    const r = await repo.reorder("mod_01", []);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });
});
