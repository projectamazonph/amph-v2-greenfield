import { describe, it, expect, beforeEach } from "vitest";
import { AdminCreateBadge } from "../AdminCreateBadge";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";

function makeRepo() {
  return {
    repo: new InMemoryBadgeRepository(),
    audit: new InMemoryAuditLog(),
  };
}

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
  });
}

describe("AdminCreateBadge", () => {
  let repo: InMemoryBadgeRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminCreateBadge;

  beforeEach(() => {
    ({ repo, audit } = makeRepo());
    useCase = new AdminCreateBadge({ badgeRepo: repo, recordAuditLog: makeRecordAuditLog(audit) });
  });

  it("creates a badge with valid slug", async () => {
    const r = await useCase.execute({
      slug: "first-quiz-pass",
      name: "First Quiz Pass",
      description: "Pass your first quiz",
      iconName: "Trophy",
      xpReward: 50,
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.badge.slug).toBe("first-quiz-pass");
    expect(r.value.badge.xpReward).toBe(50);
  });

  it("returns invalid_slug for unknown slug", async () => {
    const r = await useCase.execute({
      slug: "made-up-slug",
      name: "Test",
      description: "Test",
      iconName: "Trophy",
      xpReward: 10,
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_slug");
  });

  it("returns slug_taken when slug already exists", async () => {
    await useCase.execute({
      slug: "first-quiz-pass",
      name: "First Quiz Pass",
      description: "x",
      iconName: "Trophy",
      xpReward: 10,
      actorId: "admin_1",
    });
    const r = await useCase.execute({
      slug: "first-quiz-pass",
      name: "Dup",
      description: "x",
      iconName: "Trophy",
      xpReward: 10,
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("slug_taken");
  });

  it("writes audit log on success", async () => {
    await useCase.execute({
      slug: "5-day-streak",
      name: "5 Day Streak",
      description: "x",
      iconName: "Fire",
      xpReward: 30,
      actorId: "admin_1",
    });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "badge.created")).toBe(true);
  });

  it("writes audit log on invalid_slug failure", async () => {
    await useCase.execute({
      slug: "bogus",
      name: "x",
      description: "x",
      iconName: "Trophy",
      xpReward: 1,
      actorId: "admin_1",
    });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "badge.create_failed")).toBe(true);
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryBadgeRepository();
    badRepo.create = async () => ({
      ok: false,
      error: { kind: "db_error", message: "db down" },
    });
    const audit2 = new InMemoryAuditLog();
    const uc = new AdminCreateBadge({
      badgeRepo: badRepo,
      recordAuditLog: makeRecordAuditLog(audit2),
    });
    const r = await uc.execute({
      slug: "first-quiz-pass",
      name: "x",
      description: "x",
      iconName: "Trophy",
      xpReward: 1,
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
