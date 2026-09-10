/**
 * Tests for AdminUpdateAnnouncement.
 *
 * P1-07 (P4 PR-A). Partial updates + window validation.
 */

import { describe, it, expect } from "vitest";
import { AdminUpdateAnnouncement } from "../AdminUpdateAnnouncement";
import { InMemoryAnnouncementRepository } from "@/infra/repositories/inmemory/InMemoryAnnouncementRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { SilentLogger } from "@/infra/observability/SilentLogger";

function make() {
  const repo = new InMemoryAnnouncementRepository();
  repo._seed({
    id: "a1",
    title: "Old title",
    body: "Old body",
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
  const useCase = new AdminUpdateAnnouncement({
    announcementRepo: repo,
    recordAuditLog,
  });
  return { repo, auditLog, useCase };
}

describe("AdminUpdateAnnouncement", () => {
  it("updates a single field without touching others", async () => {
    const { repo, useCase } = make();
    const r = await useCase.execute({
      id: "a1",
      title: "New title",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    const row = await repo.findById("a1");
    expect(row.ok && row.value?.title).toBe("New title");
    expect(row.ok && row.value?.body).toBe("Old body");
  });

  it("rejects a window where endsAt <= startsAt", async () => {
    const { useCase } = make();
    const r = await useCase.execute({
      id: "a1",
      startsAt: new Date("2026-09-10T00:00:00Z"),
      endsAt: new Date("2026-09-09T00:00:00Z"),
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("invalid_window");
  });

  it("returns not_found for unknown id", async () => {
    const { useCase } = make();
    const r = await useCase.execute({
      id: "nope",
      title: "anything",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("not_found");
  });
});
