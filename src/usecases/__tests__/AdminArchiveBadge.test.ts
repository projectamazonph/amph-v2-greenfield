import { describe, it, expect, beforeEach } from "vitest";
import { AdminArchiveBadge } from "../AdminArchiveBadge";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createBadge } from "@/domain/entities/Badge";

function makeBadge(overrides: Partial<Parameters<typeof createBadge>[0]> = {}) {
  const r = createBadge({
    slug: "first-quiz-pass",
    name: "First Quiz Pass",
    description: "x",
    iconName: "Trophy",
    xpReward: 50,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
  });
}

describe("AdminArchiveBadge", () => {
  let repo: InMemoryBadgeRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminArchiveBadge;

  beforeEach(() => {
    repo = new InMemoryBadgeRepository();
    audit = new InMemoryAuditLog();
    useCase = new AdminArchiveBadge({
      badgeRepo: repo,
      recordAuditLog: makeRecordAuditLog(audit),
    });
  });

  it("archives a badge", async () => {
    repo.seed(makeBadge());
    const r = await useCase.execute({ slug: "first-quiz-pass", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.badgeSlug).toBe("first-quiz-pass");
    const found = await repo.findBySlug("first-quiz-pass");
    expect(found.ok).toBe(true);
    if (!found.ok || !found.value) return;
    expect(found.value.archived).toBe(true);
  });

  it("returns not_found for missing slug", async () => {
    const r = await useCase.execute({ slug: "first-quiz-pass", actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("writes audit log on success and failure", async () => {
    await useCase.execute({ slug: "5-day-streak", actorId: "admin_1" });
    repo.seed(makeBadge());
    await useCase.execute({ slug: "first-quiz-pass", actorId: "admin_1" });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "badge.archived")).toBe(true);
    expect(logs.some((l) => l.action === "badge.archive_failed")).toBe(true);
  });
});
