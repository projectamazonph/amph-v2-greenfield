/**
 * PrismaLessonRepository adapter test, P0-2 follow-up (STORY-048c).
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaSimulatorScenarioRepository.test.ts / PrismaLiveClassRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaLessonRepository } from "@/infra/repositories/PrismaLessonRepository";
import type { Lesson } from "@/domain/entities/Lesson";

interface LessonRow {
  id: string;
  moduleId: string;
  title: string;
  type: string;
  content: unknown;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: LessonRow[] = [];
  failNextFind = false;

  lesson = {
    create: async (args: { data: Omit<LessonRow, "createdAt" | "updatedAt"> }) => {
      const row: LessonRow = { ...args.data, createdAt: new Date(), updatedAt: new Date() };
      this.rows.push(row);
      return row;
    },
    findUnique: async (args: { where: { id: string } }) => {
      if (this.failNextFind) {
        this.failNextFind = false;
        throw new Error("forced find error");
      }
      return this.rows.find((r) => r.id === args.where.id) ?? null;
    },
    findMany: async (args: { where?: { moduleId?: string } }) => {
      let rows = [...this.rows];
      if (args.where?.moduleId !== undefined) {
        rows = rows.filter((r) => r.moduleId === args.where!.moduleId);
      }
      return rows.sort((a, b) => a.displayOrder - b.displayOrder);
    },
    update: async (args: { where: { id: string }; data: Partial<LessonRow> }) => {
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      Object.assign(row, args.data, { updatedAt: new Date() });
      return row;
    },
    delete: async (args: { where: { id: string } }) => {
      const idx = this.rows.findIndex((r) => r.id === args.where.id);
      if (idx === -1) {
        const err = new Error("Record not found") as Error & { code: string };
        err.code = "P2025";
        throw err;
      }
      const [row] = this.rows.splice(idx, 1);
      return row;
    },
  };

  $transaction = async <T>(ops: Promise<T>[]): Promise<T[]> => Promise.all(ops);
}

function makeLesson(overrides: Partial<Lesson> = {}): Lesson {
  return {
    id: overrides.id ?? "les_1",
    moduleId: overrides.moduleId ?? "mod_1",
    title: overrides.title ?? "Lesson One",
    type: overrides.type ?? "TEXT",
    content: overrides.content ?? { body: "Hello, VA." },
    displayOrder: overrides.displayOrder ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe("PrismaLessonRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaLessonRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaLessonRepository(db as never);
  });

  it("create + findById round-trips a lesson", async () => {
    const createResult = await repo.create(makeLesson());
    expect(createResult.ok).toBe(true);

    const found = await repo.findById("les_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.title).toBe("Lesson One");
    expect(found.value.type).toBe("TEXT");
    expect(found.value.content).toEqual({ body: "Hello, VA." });
  });

  it("findById returns not_found for an unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("findById returns db_error on an unexpected failure", async () => {
    db.failNextFind = true;
    const result = await repo.findById("les_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findByModuleId returns lessons sorted by displayOrder ascending", async () => {
    await repo.create(makeLesson({ id: "les_2", displayOrder: 2 }));
    await repo.create(makeLesson({ id: "les_1", displayOrder: 1 }));

    const result = await repo.findByModuleId("mod_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((l) => l.id)).toEqual(["les_1", "les_2"]);
  });

  it("findByModuleId excludes lessons from other modules", async () => {
    await repo.create(makeLesson({ id: "les_1", moduleId: "mod_1" }));
    await repo.create(makeLesson({ id: "les_2", moduleId: "mod_2" }));

    const result = await repo.findByModuleId("mod_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((l) => l.id)).toEqual(["les_1"]);
  });

  it("round-trips a VIDEO lesson's content", async () => {
    await repo.create(makeLesson({ id: "les_1", type: "VIDEO", content: { durationMinutes: 12 } }));
    const found = await repo.findById("les_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.content).toEqual({ durationMinutes: 12 });
  });

  it("round-trips a QUIZ lesson's content", async () => {
    const questions = [
      { id: "q1", prompt: "What is ACOS?", options: ["A", "B"], correctOptionIndex: 0 },
    ];
    await repo.create(makeLesson({ id: "les_1", type: "QUIZ", content: { questions } }));
    const found = await repo.findById("les_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.content).toEqual({ questions });
  });

  it("update persists changed fields", async () => {
    await repo.create(makeLesson({ id: "les_1", title: "Old Title" }));
    const result = await repo.update(makeLesson({ id: "les_1", title: "New Title" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("New Title");
  });

  it("update returns not_found when the lesson does not exist", async () => {
    const result = await repo.update(makeLesson({ id: "never-created" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("delete removes the lesson", async () => {
    await repo.create(makeLesson({ id: "les_1" }));
    const result = await repo.delete("les_1");
    expect(result.ok).toBe(true);

    const found = await repo.findById("les_1");
    expect(found.ok).toBe(false);
  });

  it("delete returns not_found when the lesson does not exist", async () => {
    const result = await repo.delete("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("reorder applies the new displayOrder to every lesson in the module", async () => {
    await repo.create(makeLesson({ id: "les_1", displayOrder: 1 }));
    await repo.create(makeLesson({ id: "les_2", displayOrder: 2 }));
    await repo.create(makeLesson({ id: "les_3", displayOrder: 3 }));

    const result = await repo.reorder("mod_1", ["les_3", "les_1", "les_2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((l) => ({ id: l.id, displayOrder: l.displayOrder }))).toEqual([
      { id: "les_3", displayOrder: 1 },
      { id: "les_1", displayOrder: 2 },
      { id: "les_2", displayOrder: 3 },
    ]);
  });

  it("reorder rejects an input list missing an existing lesson", async () => {
    await repo.create(makeLesson({ id: "les_1", displayOrder: 1 }));
    await repo.create(makeLesson({ id: "les_2", displayOrder: 2 }));

    const result = await repo.reorder("mod_1", ["les_1"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("reorder rejects an input list with a lesson from another module", async () => {
    await repo.create(makeLesson({ id: "les_1", moduleId: "mod_1", displayOrder: 1 }));
    await repo.create(makeLesson({ id: "les_2", moduleId: "mod_2", displayOrder: 1 }));

    const result = await repo.reorder("mod_1", ["les_2"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error instead of hydrating a row with an invalid type", async () => {
    db.rows.push({
      id: "corrupt-1",
      moduleId: "mod_1",
      title: "Corrupt Lesson",
      type: "NOT_A_TYPE",
      content: { body: "irrelevant" },
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await repo.findById("corrupt-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error instead of hydrating a row with content that doesn't match its type", async () => {
    db.rows.push({
      id: "corrupt-2",
      moduleId: "mod_1",
      title: "Corrupt Lesson",
      type: "VIDEO",
      content: { body: "this is TEXT content, not VIDEO" },
      displayOrder: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await repo.findById("corrupt-2");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
