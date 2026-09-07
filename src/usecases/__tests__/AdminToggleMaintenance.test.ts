/**
 * Use case tests for AdminToggleMaintenance — P1-08 (P4 PR-A).
 *
 * Authorisation is deliberately not exercised here: the use case
 * trusts the actorId passed in (matching every other admin use
 * case in the codebase). The server action enforces
 * `requireAdmin()`; that boundary is covered by the integration
 * suite at the action layer.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminToggleMaintenance } from "../AdminToggleMaintenance";
import { InMemoryMaintenanceSettingRepository } from "@/infra/repositories/inmemory/InMemoryMaintenanceSettingRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

const T0 = new Date("2026-03-01T08:00:00.000Z");
const T1 = new Date("2026-03-01T09:00:00.000Z");

function makeRecordAuditLog(audit: InMemoryAuditLog, clock: FixedClock) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: {
      newId: () => `audit_${audit.getAll().length + 1}`,
      paymentRef: () => "x",
      receiptNumber: () => "x",
    },
    clock,
    logger: new SilentLogger(),
  });
}

describe("AdminToggleMaintenance", () => {
  let repo: InMemoryMaintenanceSettingRepository;
  let audit: InMemoryAuditLog;
  let clock: FixedClock;
  let useCase: AdminToggleMaintenance;

  beforeEach(() => {
    repo = new InMemoryMaintenanceSettingRepository();
    audit = new InMemoryAuditLog();
    clock = new FixedClock(T0);
    useCase = new AdminToggleMaintenance({
      maintenanceRepo: repo,
      recordAuditLog: makeRecordAuditLog(audit, clock),
      clock,
    });
  });

  it("creates the singleton row on first toggle", async () => {
    const r = await useCase.execute({
      actorId: "admin_alice",
      enabled: true,
      message: "Going down",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.id).toBe("current");
    expect(r.value.enabled).toBe(true);
    expect(r.value.message).toBe("Going down");
    expect(r.value.updatedById).toBe("admin_alice");
    expect(r.value.updatedAt).toEqual(T0);

    const stored = await repo.getCurrent();
    expect(stored.ok).toBe(true);
    if (!stored.ok) return;
    expect(stored.value?.enabled).toBe(true);
  });

  it("updates the existing row on subsequent toggles", async () => {
    await useCase.execute({
      actorId: "admin_alice",
      enabled: false,
      message: null,
    });
    clock.set(T1);
    const r = await useCase.execute({
      actorId: "admin_bob",
      enabled: true,
      message: "Upgrading DB",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.updatedAt).toEqual(T1);
    expect(r.value.updatedById).toBe("admin_bob");
    expect(r.value.message).toBe("Upgrading DB");
  });

  it("writes an audit log entry on success", async () => {
    const r = await useCase.execute({
      actorId: "admin_alice",
      enabled: true,
      message: "Going down",
    });
    expect(r.ok).toBe(true);
    const entries = audit.getAll();
    expect(entries).toHaveLength(1);
    const entry = entries[0]!;
    expect(entry.action).toBe("maintenance.toggled");
    expect(entry.targetType).toBe("maintenance");
    expect(entry.targetId).toBe("current");
    expect(entry.actorId).toBe("admin_alice");
    expect(entry.metadata).toMatchObject({
      outcome: "success",
      enabled: true,
      message: "Going down",
    });
  });

  it("returns db_error and writes an audit entry when the repo read fails", async () => {
    const broken = new InMemoryMaintenanceSettingRepository();
    // Simulate a DB error by overriding getCurrent to return a failure.
    broken.getCurrent = async () => ({ ok: false, error: { kind: "db_error", message: "boom" } });
    const uc = new AdminToggleMaintenance({
      maintenanceRepo: broken,
      recordAuditLog: makeRecordAuditLog(audit, clock),
      clock,
    });
    const r = await uc.execute({
      actorId: "admin_alice",
      enabled: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
    const entries = audit.getAll();
    expect(entries.some((e) => e.action === "maintenance.toggled" && (e.metadata as Record<string, unknown>).outcome === "db_error")).toBe(true);
  });

  it("returns db_error and writes an audit entry when the upsert fails", async () => {
    const broken = new InMemoryMaintenanceSettingRepository();
    broken.upsert = async () => ({ ok: false, error: { kind: "db_error", message: "write failed" } });
    const uc = new AdminToggleMaintenance({
      maintenanceRepo: broken,
      recordAuditLog: makeRecordAuditLog(audit, clock),
      clock,
    });
    const r = await uc.execute({
      actorId: "admin_alice",
      enabled: true,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
    const entries = audit.getAll();
    expect(entries.some((e) => (e.metadata as Record<string, unknown>).outcome === "db_error")).toBe(true);
  });

  it("preserves existing message when message arg is omitted", async () => {
    await useCase.execute({
      actorId: "admin_alice",
      enabled: true,
      message: "Original message",
    });
    const r = await useCase.execute({
      actorId: "admin_bob",
      enabled: false,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBe("Original message");
  });

  it("clears the message when message arg is null", async () => {
    await useCase.execute({
      actorId: "admin_alice",
      enabled: true,
      message: "Original",
    });
    const r = await useCase.execute({
      actorId: "admin_bob",
      enabled: false,
      message: null,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.message).toBeNull();
  });

  it("persists allowedAdminIds when supplied", async () => {
    const r = await useCase.execute({
      actorId: "admin_alice",
      enabled: true,
      allowedAdminIds: ["admin_bob", "admin_carol"],
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.allowedAdminIds).toEqual(["admin_bob", "admin_carol"]);
  });
});