/**
 * UpdateModule.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpdateModule } from "@/usecases/UpdateModule";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { FixedClock } from "@/ports/system/Clock";
import { createModule, type Module } from "@/domain/entities/Module";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date()),
  });
}

async function seedModule(
  repo: InMemoryModuleRepository,
  overrides: Partial<Module> = {},
): Promise<Module> {
  const r = createModule({
    id: "m1",
    courseId: "course_01",
    title: "Old Title",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("UpdateModule", () => {
  let moduleRepo: InMemoryModuleRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: UpdateModule;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new UpdateModule({
      moduleRepo,
      clock: new FixedClock(new Date("2026-07-19T12:00:00Z")),
      recordAuditLog,
    });
  });

  it("updates the title on the happy path", async () => {
    await seedModule(moduleRepo);

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "New Title" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.title).toBe("New Title");
  });

  it("preserves the displayOrder on title update", async () => {
    await seedModule(moduleRepo, { displayOrder: 3 });

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "New" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.displayOrder).toBe(3);
  });

  it("bumps updatedAt to the injected clock", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    const clock = new FixedClock(t0);
    useCase = new UpdateModule({ moduleRepo, clock, recordAuditLog });
    const seeded = await seedModule(moduleRepo, {
      updatedAt: new Date("2025-01-01T00:00:00Z"),
    });

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "New" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.updatedAt).toEqual(t0);
    expect(r.value.module.updatedAt).not.toEqual(seeded.updatedAt);
  });

  it("preserves the original createdAt", async () => {
    const originalCreated = new Date("2025-01-01T00:00:00Z");
    await seedModule(moduleRepo, { createdAt: originalCreated });

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "New" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.createdAt).toEqual(originalCreated);
  });

  it("returns module_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({
      moduleId: "missing",
      patch: { title: "X" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("module_not_found");
  });

  it("returns invalid_input for empty title", async () => {
    await seedModule(moduleRepo);

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "   " },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("returns db_error when the repo errors on findById", async () => {
    moduleRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "find failed" },
    });

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "X" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when the repo errors on update", async () => {
    await seedModule(moduleRepo);
    moduleRepo.update = async () => ({
      ok: false,
      error: { kind: "db_error", message: "update failed" },
    });

    const r = await useCase.execute({
      moduleId: "m1",
      patch: { title: "X" },
      actorId: "admin_1",
    });

    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("persists the updated module", async () => {
    await seedModule(moduleRepo);
    await useCase.execute({ moduleId: "m1", patch: { title: "New" }, actorId: "admin_1" });

    const persisted = await moduleRepo.findById("m1");
    expect(persisted.ok).toBe(true);
    if (!persisted.ok) return;
    expect(persisted.value.title).toBe("New");
  });

  it("records an audit log entry on success", async () => {
    await seedModule(moduleRepo);
    await useCase.execute({ moduleId: "m1", patch: { title: "New" }, actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.updated")).toBe(true);
  });

  it("records an audit log entry on failure", async () => {
    await useCase.execute({ moduleId: "missing", patch: { title: "X" }, actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.update_failed")).toBe(true);
  });
});
