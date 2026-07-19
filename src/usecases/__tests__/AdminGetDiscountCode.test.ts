import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetDiscountCode } from "../AdminGetDiscountCode";
import { InMemoryDiscountCodeRepository } from "@/infra/repositories/InMemoryDiscountCodeRepository";
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

describe("AdminGetDiscountCode", () => {
  let repo: InMemoryDiscountCodeRepository;
  let useCase: AdminGetDiscountCode;

  beforeEach(() => {
    repo = new InMemoryDiscountCodeRepository();
    useCase = new AdminGetDiscountCode({ discountCodeRepo: repo });
  });

  it("returns the discount code when found", async () => {
    repo.seed(makeDiscountCode({ id: "dc_found" }));
    const r = await useCase.execute("dc_found");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.code).toBe("SAVE20");
  });

  it("returns not_found when the code does not exist", async () => {
    const r = await useCase.execute("nonexistent");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryDiscountCodeRepository();
    badRepo.findById = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new AdminGetDiscountCode({ discountCodeRepo: badRepo });
    const r = await uc.execute("dc_1");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
