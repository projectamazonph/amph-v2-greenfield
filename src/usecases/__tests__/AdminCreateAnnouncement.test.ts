/**
 * Tests for AdminCreateAnnouncement.
 *
 * P1-07 (P4 PR-A). Verifies the validation pipeline, persistence,
 * and audit log writes.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { AdminCreateAnnouncement } from "../AdminCreateAnnouncement";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function makeDeps() {
  const repo = new InMemoryAnnouncementRepository({
    idGen: () => "ann_1",
    clock: () => new Date("2026-09-01T00:00:00Z"),
  });
  const auditLog = new InMemoryAuditLog();
  const recordAuditLog = new RecordAuditLog({
    auditLog,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-09-01T00:00:00Z")),
    logger: new SilentLogger(),
  });
  const useCase = new AdminCreateAnnouncement({
    announcementRepo: repo,
    idGen: { newId: () => "ann_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2026-09-01T00:00:00Z")),
    recordAuditLog,
  });
  return { repo, auditLog, useCase };
}

describe("AdminCreateAnnouncement", () => {
  it("creates an announcement and writes audit log", async () => {
    const { useCase, repo, auditLog } = makeDeps();
    const r = await useCase.execute({
      title: "Heads up",
      body: "Body text",
      level: "INFO",
      isActive: true,
      startsAt: null,
      endsAt: null,
      dismissible: true,
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.announcementId).toBe("ann_1");

    const found = await repo.findById("ann_1");
    expect(found.ok).toBe(true);
    if (found.ok) {
      expect(found.value?.title).toBe("Heads up");
      expect(found.value?.isActive).toBe(true);
    }
    expect(
      auditLog.getAll().some((e) => e.action === "announcement.created"),
    ).toBe(true);
  });

  it("rejects invalid title and writes failure audit", async () => {
    const { useCase, auditLog } = makeDeps();
    const r = await useCase.execute({
      title: "   ",
      body: "Body",
      level: "INFO",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_title");
    expect(
      auditLog.getAll().some((e) => e.action === "announcement.create_failed"),
    ).toBe(true);
  });

  it("rejects invalid window", async () => {
    const { useCase } = makeDeps();
    const r = await useCase.execute({
      title: "T",
      body: "B",
      level: "INFO",
      startsAt: new Date("2026-09-10T00:00:00Z"),
      endsAt: new Date("2026-09-09T00:00:00Z"),
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_window");
  });
});
