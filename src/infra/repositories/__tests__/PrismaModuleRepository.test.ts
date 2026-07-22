/**
 * PrismaModuleRepository adapter test, P0-2 follow-up (STORY-048b).
 *
 * Uses a hand-rolled in-memory PrismaClient fake so the test stays fast
 * and DB-free, following the pattern established by
 * PrismaSimulatorScenarioRepository.test.ts / PrismaLiveClassRepository.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaModuleRepository } from "@/infra/repositories/PrismaModuleRepository";
import type { Module } from "@/domain/entities/Module";

interface ModuleRow {
  id: string;
  courseId: string;
  title: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

class FakePrismaClient {
  rows: ModuleRow[] = [];
  failNextFind = false;

  module = {
    create: async (args: { data: Omit<ModuleRow, "createdAt" | "updatedAt"> }) => {
      const row: ModuleRow = { ...args.data, createdAt: new Date(), updatedAt: new Date() };
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
    findMany: async (args: { where?: { courseId?: string } }) => {
      let rows = [...this.rows];
      if (args.where?.courseId !== undefined) {
        rows = rows.filter((r) => r.courseId === args.where!.courseId);
      }
      return rows.sort((a, b) => a.displayOrder - b.displayOrder);
    },
    update: async (args: { where: { id: string }; data: Partial<ModuleRow> }) => {
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

function makeModule(overrides: Partial<Module> = {}): Module {
  return {
    id: overrides.id ?? "mod_1",
    courseId: overrides.courseId ?? "course_1",
    title: overrides.title ?? "Module One",
    displayOrder: overrides.displayOrder ?? 1,
    createdAt: overrides.createdAt ?? new Date(),
    updatedAt: overrides.updatedAt ?? new Date(),
  };
}

describe("PrismaModuleRepository", () => {
  let db: FakePrismaClient;
  let repo: PrismaModuleRepository;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaModuleRepository(db as never);
  });

  it("create + findById round-trips a module", async () => {
    const createResult = await repo.create(makeModule());
    expect(createResult.ok).toBe(true);

    const found = await repo.findById("mod_1");
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value.title).toBe("Module One");
    expect(found.value.courseId).toBe("course_1");
  });

  it("findById returns not_found for an unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("findById returns db_error on an unexpected failure", async () => {
    db.failNextFind = true;
    const result = await repo.findById("mod_1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findByCourseId returns modules sorted by displayOrder ascending", async () => {
    await repo.create(makeModule({ id: "mod_2", displayOrder: 2 }));
    await repo.create(makeModule({ id: "mod_1", displayOrder: 1 }));

    const result = await repo.findByCourseId("course_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => m.id)).toEqual(["mod_1", "mod_2"]);
  });

  it("findByCourseId excludes modules from other courses", async () => {
    await repo.create(makeModule({ id: "mod_1", courseId: "course_1" }));
    await repo.create(makeModule({ id: "mod_2", courseId: "course_2" }));

    const result = await repo.findByCourseId("course_1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => m.id)).toEqual(["mod_1"]);
  });

  it("update persists changed fields", async () => {
    await repo.create(makeModule({ id: "mod_1", title: "Old Title" }));
    const result = await repo.update(makeModule({ id: "mod_1", title: "New Title" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("New Title");
  });

  it("update returns not_found when the module does not exist", async () => {
    const result = await repo.update(makeModule({ id: "never-created" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("delete removes the module", async () => {
    await repo.create(makeModule({ id: "mod_1" }));
    const result = await repo.delete("mod_1");
    expect(result.ok).toBe(true);

    const found = await repo.findById("mod_1");
    expect(found.ok).toBe(false);
  });

  it("delete returns not_found when the module does not exist", async () => {
    const result = await repo.delete("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("reorder applies the new displayOrder to every module in the course", async () => {
    await repo.create(makeModule({ id: "mod_1", displayOrder: 1 }));
    await repo.create(makeModule({ id: "mod_2", displayOrder: 2 }));
    await repo.create(makeModule({ id: "mod_3", displayOrder: 3 }));

    const result = await repo.reorder("course_1", ["mod_3", "mod_1", "mod_2"]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((m) => ({ id: m.id, displayOrder: m.displayOrder }))).toEqual([
      { id: "mod_3", displayOrder: 1 },
      { id: "mod_1", displayOrder: 2 },
      { id: "mod_2", displayOrder: 3 },
    ]);
  });

  it("reorder rejects an input list missing an existing module", async () => {
    await repo.create(makeModule({ id: "mod_1", displayOrder: 1 }));
    await repo.create(makeModule({ id: "mod_2", displayOrder: 2 }));

    const result = await repo.reorder("course_1", ["mod_1"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("reorder rejects an input list with a module from another course", async () => {
    await repo.create(makeModule({ id: "mod_1", courseId: "course_1", displayOrder: 1 }));
    await repo.create(makeModule({ id: "mod_2", courseId: "course_2", displayOrder: 1 }));

    const result = await repo.reorder("course_1", ["mod_2"]);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("findById returns db_error instead of hydrating a row with an invalid displayOrder", async () => {
    db.rows.push({
      id: "corrupt-1",
      courseId: "course_1",
      title: "Corrupt Module",
      displayOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const result = await repo.findById("corrupt-1");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
