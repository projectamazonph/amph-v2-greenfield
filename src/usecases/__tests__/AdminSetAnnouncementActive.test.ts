/**
 * Tests for AdminSetAnnouncementActive.
 *
 * P1-07 (P4 PR-A). Verifies toggle behavior + audit log.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminSetAnnouncementActive } from "../AdminSetAnnouncementActive";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function make() {
  const repo = new InMemoryAnnouncementRepository({
    clock: () => new Date("2026-09-01T00:00:00Z"),
  });
  repo._seed({
    id: "a1",
    title: "T",
    body: "B",
    level: "INFO",
    isActive: false,
    startsAt: null,
    endsAt: null,
    dismissible: true,
    createdAt: new Date("2026-09-01T00:00:00Z"),
    updatedAt: new Date("2026-09-01T00:00:00Z"),
    createdById: "admin_1",
    updatedById: "admin_1",
  });
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date()),
    logger: new SilentLogger(),
  });
  const useCase = new AdminSetAnnouncementActive({
    announcementRepo: repo,
    recordAuditLog,
  });
  return { repo, auditLog, useCase };
}

describe("AdminSetAnnouncementActive", () => {
  it("flips the active flag and writes an audit log entry", async () => {
    const { repo, auditLog, useCase } = make();
    const r = await useCase.execute({ id: "a1", active: true, actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.isActive).toBe(true);
    const row = await repo.findById("a1");
    expect(row.ok && row.value?.isActive).toBe(true);
    expect(
      auditLog.getAll().some((e) => e.action === "announcement.toggled"),
    ).toBe(true);
  });

  it("returns not_found for unknown id", async () => {
    const { useCase } = make();
    const r = await useCase.execute({ id: "nope", active: true, actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_found");
  });
});
