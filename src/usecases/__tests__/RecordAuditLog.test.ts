/**
 * RecordAuditLog.test.ts — STORY-050a.
 *
 * The most important test: this use case MUST NOT fail. A failed
 * audit log write must not fail the business operation.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import type { IdGenerator } from "@/ports/system/IdGenerator";

function makeIdGen(): IdGenerator {
  let n = 0;
  return {
    newId: () => `ale_${++n}`,
    paymentRef: () => "AMPH-x",
    receiptNumber: () => "AMPH-2026-x",
  };
}

describe("RecordAuditLog", () => {
  let auditLog: InMemoryAuditLog;
  let useCase: RecordAuditLog;

  beforeEach(() => {
    auditLog = new InMemoryAuditLog();
    useCase = new RecordAuditLog({
      auditLog,
      idGen: makeIdGen(),
      clock: new FixedClock(new Date("2026-07-19T00:00:00Z")),
    });
  });

  it("records an entry on the happy path", async () => {
    const r = await useCase.execute({
      actorId: "u1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
      metadata: { title: "Intro" },
    });

    expect(r.recorded).toBe(true);
    const all = auditLog.getAll();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({
      actorId: "u1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
      metadata: { title: "Intro" },
    });
  });

  it("assigns id via the injected idGen", async () => {
    let n = 0;
    const idGen: IdGenerator = {
      newId: () => `custom_${++n}`,
      paymentRef: () => "AMPH-x",
      receiptNumber: () => "AMPH-2026-x",
    };
    useCase = new RecordAuditLog({
      auditLog,
      idGen,
      clock: new FixedClock(new Date()),
    });

    await useCase.execute({
      actorId: "u1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
    });

    expect(auditLog.getAll()[0]?.id).toBe("custom_1");
  });

  it("assigns occurredAt via the injected clock", async () => {
    const t0 = new Date("2026-07-19T12:00:00Z");
    useCase = new RecordAuditLog({
      auditLog,
      idGen: makeIdGen(),
      clock: new FixedClock(t0),
    });

    await useCase.execute({
      actorId: "u1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
    });

    expect(auditLog.getAll()[0]?.occurredAt).toEqual(t0);
  });

  it("DOES NOT throw when the audit log write fails — returns recorded: false", async () => {
    const failingLog = {
      record: vi.fn(async () => ({
        ok: false,
        error: { kind: "db_error" as const, message: "store down" },
      })),
    };
    useCase = new RecordAuditLog({
      auditLog: failingLog as never,
      idGen: makeIdGen(),
      clock: new FixedClock(new Date()),
    });

    // Suppress console.error for this test
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await useCase.execute({
      actorId: "u1",
      action: "course.created",
      targetType: "course",
      targetId: "c1",
    });

    expect(r.recorded).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("DOES NOT throw on invalid input — returns recorded: false", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const r = await useCase.execute({
      actorId: "  ", // whitespace-only
      action: "course.created",
      targetType: "course",
      targetId: "c1",
    });

    expect(r.recorded).toBe(false);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
