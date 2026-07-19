/**
 * UpdateLesson.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpdateLesson } from "@/usecases/UpdateLesson";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { FixedClock } from "@/ports/system/Clock";
import { createLesson, type Lesson } from "@/domain/entities/Lesson";

async function seedLesson(repo: InMemoryLessonRepository, overrides: Partial<Lesson> = {}): Promise<Lesson> {
  const r = createLesson({
    id: "l1",
    moduleId: "mod_01",
    title: "Old Title",
    type: "TEXT",
    content: { body: "old" },
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("UpdateLesson", () => {
  let lessonRepo: InMemoryLessonRepository;
  let useCase: UpdateLesson;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    useCase = new UpdateLesson({
      lessonRepo,
      clock: new FixedClock(new Date("2026-07-19T12:00:00Z")),
    });
  });

  it("updates the title on the happy path", async () => {
    await seedLesson(lessonRepo);

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "New Title" },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.title).toBe("New Title");
  });

  it("updates the content while preserving the type", async () => {
    await seedLesson(lessonRepo, { type: "TEXT", content: { body: "old" } });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { content: { body: "new" } },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.type).toBe("TEXT");
    expect((r.value.lesson.content as { body: string }).body).toBe("new");
  });

  it("re-validates content when type changes", async () => {
    await seedLesson(lessonRepo, { type: "TEXT", content: { body: "hi" } });

    // Switch to VIDEO with invalid content (non-positive duration)
    const r = await useCase.execute({
      lessonId: "l1",
      patch: {
        type: "VIDEO",
        content: { durationMinutes: -1 },
      },
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("accepts type change when new content is valid", async () => {
    await seedLesson(lessonRepo, { type: "TEXT", content: { body: "hi" } });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: {
        type: "VIDEO",
        content: { durationMinutes: 10 },
      },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.type).toBe("VIDEO");
  });

  it("preserves the displayOrder on title update", async () => {
    await seedLesson(lessonRepo, { displayOrder: 3 });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "New" },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.displayOrder).toBe(3);
  });

  it("bumps updatedAt to the injected clock", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    useCase = new UpdateLesson({ lessonRepo, clock: new FixedClock(t0) });
    await seedLesson(lessonRepo, { updatedAt: new Date("2025-01-01T00:00:00Z") });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "New" },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.updatedAt).toEqual(t0);
  });

  it("returns lesson_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({
      lessonId: "missing",
      patch: { title: "X" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("lesson_not_found");
  });

  it("returns invalid_input for empty title", async () => {
    await seedLesson(lessonRepo);

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "   " },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns db_error when findById errors", async () => {
    lessonRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "X" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when update errors", async () => {
    await seedLesson(lessonRepo);
    lessonRepo.update = async () => ({
      ok: false,
      error: { kind: "db_error", message: "update failed" },
    });

    const r = await useCase.execute({
      lessonId: "l1",
      patch: { title: "X" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
