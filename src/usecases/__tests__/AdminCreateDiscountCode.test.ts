import { describe, it, expect, beforeEach } from "vitest";
import { AdminCreateDiscountCode } from "../AdminCreateDiscountCode";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createDiscountCode } from "@/domain/entities/DiscountCode";

interface MakeInput {
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  maxUses: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  courseIds: readonly string[];
  actorId: string;
}
function makeInput(overrides: Partial<MakeInput> = {}): MakeInput {
  return {
    code: "SAVE20",
    type: "PERCENTAGE" as const,
    value: 20,
    maxUses: 100,
    validFrom: null,
    validUntil: null,
    courseIds: [] as readonly string[],
    actorId: "admin_1",
    ...overrides,
  };
}

describe("AdminCreateDiscountCode", () => {
  let repo: InMemoryDiscountCodeRepository;
  let recordAuditLog: RecordAuditLog;
  let useCase: AdminCreateDiscountCode;

  beforeEach(() => {
    repo = new InMemoryDiscountCodeRepository();
    recordAuditLog = new RecordAuditLog({
      auditLog: new InMemoryAuditLog(),
      idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date()),
    });
    useCase = new AdminCreateDiscountCode({
      discountCodeRepo: repo,
      idGen: { newId: () => "disc_1", paymentRef: () => "x", receiptNumber: () => "x" },
      recordAuditLog,
    });
  });

  it("creates a discount code and returns its id", async () => {
    const r = await useCase.execute(makeInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.discountCodeId).toBeTruthy();
  });

  it("persists the code in the repository", async () => {
    await useCase.execute(makeInput({ code: "NEWCODE" }));
    const found = await repo.findByCode("NEWCODE");
    expect(found?.code).toBe("NEWCODE");
  });

  it("normalizes code to uppercase", async () => {
    await useCase.execute(makeInput({ code: "lowercase" }));
    const found = await repo.findByCode("LOWERCASE");
    expect(found).not.toBeNull();
  });

  it("fails validation when code is empty", async () => {
    const r = await useCase.execute(makeInput({ code: "   " }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_code");
  });

  it("fails validation when percentage is out of range", async () => {
    const r = await useCase.execute(makeInput({ value: 150 }));
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_value");
  });

  it("records audit log on success", async () => {
    await useCase.execute(makeInput());
    const auditLog = recordAuditLog._auditLog as InMemoryAuditLog;
    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "discount_code.created")).toBe(true);
  });
});
