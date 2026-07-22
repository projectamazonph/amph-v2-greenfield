/**
 * CreateModule.test.ts — STORY-048b.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { CreateModule } from "@/usecases/CreateModule";
import { InMemoryModuleRepository } from "@/infra/repositories/InMemoryModuleRepository";
import { FixedClock } from "@/ports/system/Clock";
import { Result } from "@/domain/shared/Result";
import type { IdGenerator } from "@/ports/system/IdGenerator";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `id_${++n}`,
    paymentRef: () => "AMPH-x",
    receiptNumber: () => "AMPH-2026-x",
  };
}

function makeRecordAuditLog(): RecordAuditLog {
  return new RecordAuditLog({
    auditLog: new InMemoryAuditLog(),
    idGen: { newId: () => "ale_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date()),
  });
}

describe("CreateModule", () => {
  let moduleRepo: InMemoryModuleRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: CreateModule;

  beforeEach(() => {
    moduleRepo = new InMemoryModuleRepository();
    recordAuditLog = makeRecordAuditLog();
    useCase = new CreateModule({
      moduleRepo,
      idGen: makeIdGen(),
      clock: new FixedClock(new Date("2026-07-19T00:00:00Z")),
      recordAuditLog,
    });
  });

  it("creates the first module with displayOrder=1", async () => {
    const r = await useCase.execute({
      courseId: "course_01",
      title: "Module 1",
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.title).toBe("Module 1");
    expect(r.value.module.displayOrder).toBe(1);
    expect(r.value.module.courseId).toBe("course_01");
  });

  it("creates the second module with displayOrder=2", async () => {
    await useCase.execute({ courseId: "course_01", title: "Module 1", actorId: "admin_1" });
    const r = await useCase.execute({
      courseId: "course_01",
      title: "Module 2",
      actorId: "admin_1",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.displayOrder).toBe(2);
  });

  it("uses the injected idGen for the new module id", async () => {
    let n = 0;
    const idGen: IdGenerator = {
      newId: () => `mod_${++n}`,
      paymentRef: () => "AMPH-x",
      receiptNumber: () => "AMPH-2026-x",
    };
    useCase = new CreateModule({
      moduleRepo,
      idGen,
      clock: new FixedClock(new Date()),
      recordAuditLog,
    });

    const r = await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.id).toBe("mod_1");
  });

  it("returns invalid_title for empty title", async () => {
    const r = await useCase.execute({ courseId: "course_01", title: "", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_title");
  });

  it("returns invalid_title for whitespace-only title", async () => {
    const r = await useCase.execute({ courseId: "course_01", title: "   ", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(resultError(r));
  });

  function resultError(r: { ok: false; error: { kind: string } }) {
    return r.error.kind;
  }

  it("returns db_error when the repo fails to list existing modules", async () => {
    moduleRepo.findByCourseId = async () => ({
      ok: false,
      error: { kind: "db_error", message: "list failed" },
    });

    const r = await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("returns db_error when the repo fails to create", async () => {
    moduleRepo.create = async () => ({
      ok: false,
      error: { kind: "db_error", message: "create failed" },
    });

    const r = await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });

  it("uses the injected clock for createdAt + updatedAt", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    useCase = new CreateModule({
      moduleRepo,
      idGen: makeIdGen(),
      clock: new FixedClock(t0),
      recordAuditLog,
    });

    const r = await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.module.createdAt).toEqual(t0);
    expect(r.value.module.updatedAt).toEqual(t0);
  });

  it("persists the module so subsequent calls see it", async () => {
    await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    await useCase.execute({ courseId: "course_01", title: "M2", actorId: "admin_1" });

    const list = await moduleRepo.findByCourseId("course_01");
    expect(list.ok).toBe(true);
    if (!list.ok) return;
    expect(list.value.length).toBe(2);
    expect(list.value.map((m) => m.title)).toEqual(["M1", "M2"]);
  });

  it("records an audit log entry on success", async () => {
    await useCase.execute({ courseId: "course_01", title: "M1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.created")).toBe(true);
  });

  it("records an audit log entry on failure", async () => {
    await useCase.execute({ courseId: "course_01", title: "   ", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "module.create_failed")).toBe(true);
  });
});
