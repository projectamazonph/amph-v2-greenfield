/**
 * SetSetting tests (P1-05).
 *
 * Pins: create and replace paths with audits, key validation,
 * and failure audits.
 */

import { describe, expect, it, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { SetSetting } from "@/usecases/SetSetting";
import { InMemorySettingRepository } from "@/infra/repositories/inmemory/InMemorySettingRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

async function makeDeps() {
  const settingRepo = new InMemorySettingRepository();
  const auditLog = new InMemoryAuditLog();
  const clock = new FixedClock(new Date("2026-09-11T00:00:00Z"));
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock,
    logger: new SilentLogger(),
  });
  const useCase = new SetSetting({ settingRepo, clock, recordAuditLog });
  return { settingRepo, auditLog, useCase };
}

describe("SetSetting", () => {
  let deps: Awaited<ReturnType<typeof makeDeps>>;

  beforeEach(async () => {
    deps = await makeDeps();
  });

  function audited(action: string): boolean {
    return deps.auditLog.getAll().some((entry) => entry.action === action);
  }

  it("creates a missing key and audits the save", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      key: "support_email",
      value: "support@projectamazonph.online",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value).toBe("support@projectamazonph.online");
    }
    expect(audited("setting.saved")).toBe(true);
  });

  it("replaces an existing key with a fresh actor stamp", async () => {
    await deps.useCase.execute({ actorId: "admin-1", key: "support_email", value: "a@x" });

    const result = await deps.useCase.execute({
      actorId: "admin-2",
      key: "support_email",
      value: "b@x",
    });

    expect(Result.isOk(result)).toBe(true);
    if (Result.isOk(result)) {
      expect(result.value.value).toBe("b@x");
      expect(result.value.updatedById).toBe("admin-2");
    }
  });

  it("rejects a malformed key", async () => {
    const result = await deps.useCase.execute({
      actorId: "admin-1",
      key: "Support Email",
      value: "x",
    });

    expect(result).toEqual(Result.err({ kind: "invalid_key" }));
    expect(audited("setting.save_failed")).toBe(true);
  });
});
