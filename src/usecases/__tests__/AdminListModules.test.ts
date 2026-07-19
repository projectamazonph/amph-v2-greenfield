/**
 * AdminListModules.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminListModules } from "@/usecases/AdminListModules";
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

describe("AdminListModules", () => {
  let moduleRepo: InMemoryModuleRepository;
  let useCase: AdminListModules;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    useCase = new AdminListModules({ moduleRepo });
  });

  it("returns the modules for the course", async () => {
    await moduleRepo.create(makeModule({ id: "m1", displayOrder: 1 }));
    await moduleRepo.create(makeModule({ id: "m2", displayOrder: 2 }));

    const r = await useCase.execute({ courseId: "course_01" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules.map((m) => m.id)).toEqual(["m1", "m2"]);
  });

  it("returns empty list when the course has no modules", async () => {
    const r = await useCase.execute({ courseId: "course_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules).toEqual([]);
  });

  it("returns modules sorted by displayOrder", async () => {
    await moduleRepo.create(makeModule({ id: "m1", displayOrder: 3 }));
    await moduleRepo.create(makeModule({ id: "m2", displayOrder: 1 }));
    await moduleRepo.create(makeModule({ id: "m3", displayOrder: 2 }));

    const r = await useCase.execute({ courseId: "course_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules.map((m) => m.id)).toEqual(["m2", "m3", "m1"]);
  });

  it("does not return modules from other courses", async () => {
    await moduleRepo.create(makeModule({ id: "m1", courseId: "course_01" }));
    await moduleRepo.create(makeModule({ id: "m2", courseId: "course_02" }));

    const r = await useCase.execute({ courseId: "course_01" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.modules.map((m) => m.id)).toEqual(["m1"]);
  });

  it("returns db_error when the repo errors", async () => {
    const repo = new InMemoryModuleRepository();
    repo.findByCourseId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });
    useCase = new AdminListModules({ moduleRepo: repo });

    const r = await useCase.execute({ courseId: "course_01" });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
