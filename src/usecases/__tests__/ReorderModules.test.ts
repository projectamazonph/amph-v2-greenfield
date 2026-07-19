/**
 * ReorderModules.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ReorderModules } from "@/usecases/ReorderModules";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { createModule, type Module } from "@/domain/entities/Module";

async function seedModule(repo: InMemoryModuleRepository, overrides: Partial<Module> = {}): Promise<Module> {
  const r = createModule({
    id: `m_${Math.random().toString(36).slice(2, 6)}`,
    courseId: "course_01",
    title: "Test",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("ReorderModules", () => {
  let moduleRepo: InMemoryModuleRepository;
  let useCase: ReorderModules;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    useCase = new ReorderModules({ moduleRepo });
  });

  it("reorders modules in the requested order", async () => {
    await seedModule(moduleRepo, { id: "m1", displayOrder: 1 });
    await seedModule(moduleRepo, { id: "m2", displayOrder: 2 });
    await seedModule(moduleRepo, { id: "m3", displayOrder: 3 });

    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m3", "m1", "m2"],
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
    expect(r.value.modules.map((m) => m.displayOrder)).toEqual([1, 2, 3]);
  });

  it("reorders when a single module moves to first position", async () => {
    await seedModule(moduleRepo, { id: "m1", displayOrder: 1 });
    await seedModule(moduleRepo, { id: "m2", displayOrder: 2 });
    await seedModule(moduleRepo, { id: "m3", displayOrder: 3 });

    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m3", "m1", "m2"],
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules[0]?.id).toBe("m3");
    expect(r.value.modules[0]?.displayOrder).toBe(1);
  });

  it("returns db_error when a module is missing from the input", async () => {
    await seedModule(moduleRepo, { id: "m1" });
    await seedModule(moduleRepo, { id: "m2" });

    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m1"],
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when the input has an extra id", async () => {
    await seedModule(moduleRepo, { id: "m1" });

    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m1", "m2"],
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when an input id belongs to a different course", async () => {
    await seedModule(moduleRepo, { id: "m1", courseId: "course_01" });
    await seedModule(moduleRepo, { id: "m2", courseId: "course_02" });

    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m1", "m2"],
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("reorders with an empty list when the course has no modules", async () => {
    const r = await useCase.execute({
      courseId: "course_01",
      moduleIds: [],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules).toEqual([]);
  });

  it("persists the new order", async () => {
    await seedModule(moduleRepo, { id: "m1", displayOrder: 1 });
    await seedModule(moduleRepo, { id: "m2", displayOrder: 2 });
    await seedModule(moduleRepo, { id: "m3", displayOrder: 3 });

    await useCase.execute({
      courseId: "course_01",
      moduleIds: ["m3", "m1", "m2"],
    });

    const list = await moduleRepo.findByCourseId("course_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((m) => m.id)).toEqual(["m3", "m1", "m2"]);
  });
});
