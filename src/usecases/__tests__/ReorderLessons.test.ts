/**
 * ReorderLessons.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ReorderLessons } from "@/usecases/ReorderLessons";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";

async function seedLesson(repo: InMemoryLessonRepository, overrides: Partial<Lesson> = {}): Promise<Lesson> {
  const r = createLesson({
    id: `l_${Math.random().toString(36).slice(2, 6)}`,
    moduleId: "mod_01",
    title: "Test",
    type: "TEXT",
    content: { body: "hi" },
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("ReorderLessons", () => {
  let lessonRepo: InMemoryLessonRepository;
  let useCase: ReorderLessons;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    useCase = new ReorderLessons({ lessonRepo });
  });

  it("reorders lessons in the requested order", async () => {
    await seedLesson(lessonRepo, { id: "l1", displayOrder: 1 });
    await seedLesson(lessonRepo, { id: "l2", displayOrder: 2 });
    await seedLesson(lessonRepo, { id: "l3", displayOrder: 3 });

    const r = await useCase.execute({
      moduleId: "mod_01",
      lessonIds: ["l3", "l1", "l2"],
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
    expect(r.value.lessons.map((l) => l.displayOrder)).toEqual([1, 2, 3]);
  });

  it("returns db_error when a lesson is missing from the input", async () => {
    await seedLesson(lessonRepo, { id: "l1" });
    await seedLesson(lessonRepo, { id: "l2" });

    const r = await useCase.execute({
      moduleId: "mod_01",
      lessonIds: ["l1"],
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when an input id belongs to a different module", async () => {
    await seedLesson(lessonRepo, { id: "l1", moduleId: "mod_01" });
    await seedLesson(lessonRepo, { id: "l2", moduleId: "mod_02" });

    const r = await useCase.execute({
      moduleId: "mod_01",
      lessonIds: ["l1", "l2"],
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("accepts reorder with empty list when the module has no lessons", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      lessonIds: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lessons).toEqual([]);
  });

  it("persists the new order", async () => {
    await seedLesson(lessonRepo, { id: "l1", displayOrder: 1 });
    await seedLesson(lessonRepo, { id: "l2", displayOrder: 2 });
    await seedLesson(lessonRepo, { id: "l3", displayOrder: 3 });

    await useCase.execute({
      moduleId: "mod_01",
      lessonIds: ["l3", "l1", "l2"],
    });

    const list = await lessonRepo.findByModuleId("mod_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((l) => l.id)).toEqual(["l3", "l1", "l2"]);
  });
});
