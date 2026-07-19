/**
 * AdminGetLesson.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetLesson } from "@/usecases/AdminGetLesson";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  const r = createLesson({
    id: "l1",
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

describe("AdminGetLesson", () => {
  let lessonRepo: InMemoryLessonRepository;
  let useCase: AdminGetLesson;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    useCase = new AdminGetLesson({ lessonRepo });
  });

  it("returns the lesson on the happy path", async () => {
    await lessonRepo.create(makeLesson({ title: "L1" }));

    const r = await useCase.execute({ lessonId: "l1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.title).toBe("L1");
  });

  it("returns lesson_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({ lessonId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("lesson_not_found");
  });

  it("returns db_error when the repo errors", async () => {
    lessonRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });

    const r = await useCase.execute({ lessonId: "l1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
