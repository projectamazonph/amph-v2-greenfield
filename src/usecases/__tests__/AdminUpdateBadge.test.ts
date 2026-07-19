import { describe, it, expect, beforeEach } from "vitest";
import { AdminUpdateBadge } from "../AdminUpdateBadge";
import { InMemoryBadgeRepository } from "@/infra/repositories/InMemoryBadgeRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createBadge } from "@/domain/entities/Badge";

function makeBadge(overrides: Partial<Parameters<typeof createBadge>[0]> = {}) {
  const r = createBadge({
    slug: "first-quiz-pass",
    name: "First Quiz Pass",
    description: "Pass your first quiz",
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

describe("AdminUpdateBadge", () => {
  let repo: InMemoryBadgeRepository;
  let audit: InMemoryAuditLog;
  let useCase: AdminUpdateBadge;

  beforeEach(() => {
    repo = new InMemoryBadgeRepository();
    audit = new InMemoryAuditLog();
    useCase = new AdminUpdateBadge({
      badgeRepo: repo,
      recordAuditLog: makeRecordAuditLog(audit),
    });
  });

  it("updates a badge's name", async () => {
    repo.seed(makeBadge());
    const r = await useCase.execute({
      slug: "first-quiz-pass",
      patch: { name: "First Quiz Master" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.badge.name).toBe("First Quiz Master");
    expect(r.value.badge.xpReward).toBe(50); // unchanged
  });

  it("updates multiple fields at once", async () => {
    repo.seed(makeBadge());
    const r = await useCase.execute({
      slug: "first-quiz-pass",
      patch: { name: "Quiz Master", description: "New desc", xpReward: 200 },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.badge.name).toBe("Quiz Master");
    expect(r.value.badge.description).toBe("New desc");
    expect(r.value.badge.xpReward).toBe(200);
  });

  it("returns not_found for missing slug", async () => {
    const r = await useCase.execute({
      slug: "first-quiz-pass",
      patch: { name: "x" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("writes audit log on success", async () => {
    repo.seed(makeBadge());
    await useCase.execute({
      slug: "first-quiz-pass",
      patch: { xpReward: 99 },
      actorId: "admin_1",
    });
    const logs = await audit.getAll();
    expect(logs.some((l) => l.action === "badge.updated")).toBe(true);
  });

  it("returns db_error on update failure", async () => {
    repo.seed(makeBadge());
    const badRepo = new InMemoryBadgeRepository();
    badRepo.findBySlug = repo.findBySlug.bind(repo);
    badRepo.update = async () => ({
      ok: false,
      error: { kind: "db_error", message: "db down" },
    });
    const audit2 = new InMemoryAuditLog();
    const uc = new AdminUpdateBadge({
      badgeRepo: badRepo,
      recordAuditLog: makeRecordAuditLog(audit2),
    });
    const r = await uc.execute({
      slug: "first-quiz-pass",
      patch: { name: "x" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
