/**
 * AdminListLessons.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminListLessons } from "@/usecases/AdminListLessons";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const r = createLesson({
    id: `les_${Math.random().toString(36).slice(2, 8)}`,
    moduleId: "mod_01",
    title: "Test",
    type: "TEXT",
    content: { body: "hi" },
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminListLessons", () => {
  let lessonRepo: InMemoryLessonRepository;
  let useCase: AdminListLessons;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    useCase = new AdminListLessons({ lessonRepo });
  });

  it("returns the lessons for the module", async () => {
    await lessonRepo.create(makeLesson({ id: "l1", displayOrder: 1 }));
    await lessonRepo.create(makeLesson({ id: "l2", displayOrder: 2 }));

    const r = await useCase.execute({ moduleId: "mod_01" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons.map((l) => l.id)).toEqual(["l1", "l2"]);
  });

  it("returns empty list when the module has no lessons", async () => {
    const r = await useCase.execute({ moduleId: "mod_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons).toEqual([]);
  });

  it("returns lessons sorted by displayOrder", async () => {
    await lessonRepo.create(makeLesson({ id: "l1", displayOrder: 3 }));
    await lessonRepo.create(makeLesson({ id: "l2", displayOrder: 1 }));
    await lessonRepo.create(makeLesson({ id: "l3", displayOrder: 2 }));

    const r = await useCase.execute({ moduleId: "mod_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons.map((l) => l.id)).toEqual(["l2", "l3", "l1"]);
  });

  it("does not return lessons from other modules", async () => {
    await lessonRepo.create(makeLesson({ id: "l1", moduleId: "mod_01" }));
    await lessonRepo.create(makeLesson({ id: "l2", moduleId: "mod_02" }));

    const r = await useCase.execute({ moduleId: "mod_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons.map((l) => l.id)).toEqual(["l1"]);
  });

  it("returns db_error when the repo errors", async () => {
    lessonRepo.findByModuleId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const r = await useCase.execute({ moduleId: "mod_01" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
