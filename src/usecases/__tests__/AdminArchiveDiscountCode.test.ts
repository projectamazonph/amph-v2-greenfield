import { describe, it, expect, beforeEach } from "vitest";
import { AdminArchiveDiscountCode } from "../AdminArchiveDiscountCode";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createDiscountCode } from "@/domain/entities/DiscountCode";

function makeDiscountCode(overrides: Partial<Parameters<typeof createDiscountCode>[0]> = {}) {
  const r = createDiscountCode({
    id: "dc_1",
    code: "SAVE20",
    type: "PERCENTAGE",
    value: 20,
    ...overrides,
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("AdminArchiveDiscountCode", () => {
  let repo: InMemoryDiscountCodeRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: AdminArchiveDiscountCode;

  beforeEach(() => {
    repo = new InMemoryDiscountCodeRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new AdminArchiveDiscountCode({
      discountCodeRepo: repo,
      recordAuditLog,
    });
  });

  it("archives an existing discount code", async () => {
    repo.seed(makeDiscountCode({ id: "dc_1" }));
    const r = await useCase.execute({ id: "dc_1", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountCodeId).toBe("dc_1");
  });

  it("is idempotent on non-existent code", async () => {
    const r = await useCase.execute({ id: "nonexistent", actorId: "admin_1" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountCodeId).toBe("nonexistent");
  });

  it("records audit log on success", async () => {
    repo.seed(makeDiscountCode({ id: "dc_1" }));
    await useCase.execute({ id: "dc_1", actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "discount_code.archived")).toBe(true);
  });
});
