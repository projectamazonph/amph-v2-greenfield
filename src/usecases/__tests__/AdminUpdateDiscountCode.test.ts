import { describe, it, expect, beforeEach } from "vitest";
import { AdminUpdateDiscountCode } from "../AdminUpdateDiscountCode";
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

describe("AdminUpdateDiscountCode", () => {
  let repo: InMemoryDiscountCodeRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: AdminUpdateDiscountCode;

  beforeEach(() => {
    repo = new InMemoryDiscountCodeRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new AdminUpdateDiscountCode({
      discountCodeRepo: repo,
      recordAuditLog,
    });
  });

  async function seed() {
    const dc = makeDiscountCode({ id: "dc_1" });
    repo.seed(dc);
    return dc;
  }

  it("updates a discount code and returns its id", async () => {
    await seed();
    const r = await useCase.execute({
      id: "dc_1",
      patch: { value: 30 },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountCodeId).toBe("dc_1");
  });

  it("persists the updated value", async () => {
    await seed();
    await useCase.execute({ id: "dc_1", patch: { value: 30 }, actorId: "admin_1" });
    const found = await repo.findById("dc_1");
    expect(found.ok && found.value?.value).toBe(30);
  });

  it("returns not_found when the code does not exist", async () => {
    const r = await useCase.execute({ id: "nonexistent", patch: { value: 30 }, actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("fails validation when updated code is invalid", async () => {
    await seed();
    const r = await useCase.execute({ id: "dc_1", patch: { code: "bad code!" }, actorId: "admin_1" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_code");
  });

  it("records audit log on success", async () => {
    await seed();
    await useCase.execute({ id: "dc_1", patch: { value: 30 }, actorId: "admin_1" });
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "discount_code.updated")).toBe(true);
  });
});
