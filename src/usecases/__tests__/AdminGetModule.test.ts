/**
 * AdminGetModule.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetModule } from "@/usecases/AdminGetModule";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { createModule, type Module } from "@/domain/entities/Module";

async function seedModule(repo: InMemoryModuleRepository, overrides: Partial<Module> = {}): Promise<Module> {
  const r = createModule({
    id: "m1",
    courseId: "course_01",
    title: "Test",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("AdminGetModule", () => {
  let moduleRepo: InMemoryModuleRepository;
  let useCase: AdminGetModule;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    useCase = new AdminGetModule({ moduleRepo });
  });

  it("returns the module on the happy path", async () => {
    await seedModule(moduleRepo, { title: "Module 1" });

    const r = await useCase.execute({ moduleId: "m1" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.title).toBe("Module 1");
  });

  it("returns module_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({ moduleId: "missing" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("module_not_found");
  });

  it("returns db_error when the repo errors", async () => {
    moduleRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });

    const r = await useCase.execute({ moduleId: "m1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
