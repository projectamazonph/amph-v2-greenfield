/**
 * CreateLesson.test.ts — STORY-048c.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateLesson } from "@/usecases/CreateLesson";
import { InMemoryLessonRepository } from "@/infra/repositories/InMemoryLessonRepository";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `id_${++n}`,
    paymentRef: () => "AMPH-x",
    receiptNumber: () => "AMPH-2026-x",
  };
}

describe("CreateLesson", () => {
  let lessonRepo: InMemoryLessonRepository;
  let useCase: CreateLesson;

  beforeEach(() => {
    lessonRepo = new InMemoryLessonRepository();
    useCase = new CreateLesson({
      lessonRepo,
      idGen: makeIdGen(),
      clock: new FixedClock(new Date("2026-07-19T00:00:00Z")),
    });
  });

  it("creates a TEXT lesson with displayOrder=1", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "hello" },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.title).toBe("L1");
    expect(r.value.lesson.type).toBe("TEXT");
    expect(r.value.lesson.displayOrder).toBe(1);
  });

  it("creates a VIDEO lesson with valid durationMinutes", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "V1",
      type: "VIDEO",
      content: { durationMinutes: 5 },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.type).toBe("VIDEO");
  });

  it("creates a QUIZ lesson with valid questions", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "Q1",
      type: "QUIZ",
      content: {
        questions: [
          {
            id: "q1",
            prompt: "What is 2+2?",
            options: ["3", "4", "5"],
            correctOptionIndex: 1,
          },
        ],
      },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.type).toBe("QUIZ");
  });

  it("rejects a VIDEO lesson with non-positive durationMinutes", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "V1",
      type: "VIDEO",
      content: { durationMinutes: 0 },
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects a TEXT lesson with empty body", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "   " },
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects a QUIZ lesson with no questions", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "Q1",
      type: "QUIZ",
      content: { questions: [] },
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("assigns sequential displayOrder", async () => {
    await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "a" },
    });
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L2",
      type: "TEXT",
      content: { body: "b" },
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.displayOrder).toBe(2);
  });

  it("uses the injected idGen for the new lesson id", async () => {
    let n = 0;
    const idGen: IdGenerator = {
      newId: () => `les_${++n}`,
      paymentRef: () => "AMPH-x",
      receiptNumber: () => "AMPH-2026-x",
    };
    useCase = new CreateLesson({ lessonRepo, idGen, clock: new FixedClock(new Date()) });

    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "a" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.id).toBe("les_1");
  });

  it("uses the injected clock for createdAt + updatedAt", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    useCase = new CreateLesson({
      lessonRepo,
      idGen: makeIdGen(),
      clock: new FixedClock(t0),
    });

    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "a" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.lesson.createdAt).toEqual(t0);
    expect(r.value.lesson.updatedAt).toEqual(t0);
  });

  it("returns invalid_input for empty title", async () => {
    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "",
      type: "TEXT",
      content: { body: "a" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns db_error when findByModuleId fails", async () => {
    lessonRepo.findByModuleId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "a" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when create fails", async () => {
    lessonRepo.create = async () => ({
      ok: false,
      error: { kind: "db_error", message: "create failed" },
    });

    const r = await useCase.execute({
      moduleId: "mod_01",
      title: "L1",
      type: "TEXT",
      content: { body: "a" },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
