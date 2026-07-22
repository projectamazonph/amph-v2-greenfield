/**
 * DeleteModule.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DeleteModule } from "@/usecases/DeleteModule";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { createModule, type Module } from "@/domain/entities/Module";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";

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
    title: "Test",
    displayOrder: 1,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  await repo.create(r.value);
  return r.value;
}

describe("DeleteModule", () => {
  let moduleRepo: InMemoryModuleRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: DeleteModule;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new DeleteModule({ moduleRepo, recordAuditLog });
  });

  it("deletes the module on the happy path", async () => {
    await seedModule(moduleRepo);

    const r = await useCase.execute({ moduleId: "m1", actorId: "admin_1" });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.deleted).toBe(true);

    const find = await moduleRepo.findById("m1");
    expect(find.ok).toBe(false);
  });

  it("returns module_not_found when the id doesn't exist", async () => {
    const r = await useCase.execute({ moduleId: "missing", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("module_not_found");
  });

  it("does not affect other modules in the same course", async () => {
    await seedModule(moduleRepo, { id: "m1", displayOrder: 1 });
    await seedModule(moduleRepo, { id: "m2", displayOrder: 2 });

    await useCase.execute({ moduleId: "m1", actorId: "admin_1" });

    const list = await moduleRepo.findByCourseId("course_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.map((m) => m.id)).toEqual(["m2"]);
    // m2's displayOrder is left alone (gap is fine, reorder can fix)
    expect(list.value[0]?.displayOrder).toBe(2);
  });

  it("returns db_error when the repo errors", async () => {
    moduleRepo.delete = async () => ({
      ok: false,
      error: { kind: "db_error", message: "delete failed" },
    });

    const r = await useCase.execute({ moduleId: "m1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("records an audit log entry on success", async () => {
    await seedModule(moduleRepo);
    await useCase.execute({ moduleId: "m1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.deleted")).toBe(true);
  });

  it("records an audit log entry on failure", async () => {
    await useCase.execute({ moduleId: "missing", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.delete_failed")).toBe(true);
  });
});
