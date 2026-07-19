import { describe, it, expect, beforeEach } from "vitest";
import { AdminListDiscountCodes } from "../AdminListDiscountCodes";
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
  if (!r.ok) throw new Error("seed failed: " + JSON.stringify(r.error));
  return r.value;
}

describe("AdminListDiscountCodes", () => {
  let repo: InMemoryDiscountCodeRepository;
  let useCase: AdminListDiscountCodes;

  beforeEach(() => {
    repo = new InMemoryDiscountCodeRepository();
    useCase = new AdminListDiscountCodes({ discountCodeRepo: repo });
  });

  it("lists all active discount codes", async () => {
    repo.seed(makeDiscountCode({ id: "dc_1", code: "SAVE20" }));
    repo.seed(makeDiscountCode({ id: "dc_2", code: "FLAT50" }));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(2);
  });

  it("excludes archived discount codes", async () => {
    repo.seed(makeDiscountCode({ id: "dc_active" }));
    repo.seed(makeDiscountCode({ id: "dc_archived" }));
    await repo.archive("dc_archived");

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.value.map((c) => c.id);
    expect(ids).toContain("dc_active");
    expect(ids).not.toContain("dc_archived");
  });

  it("returns empty list when no codes", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toHaveLength(0);
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryDiscountCodeRepository();
    badRepo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new AdminListDiscountCodes({ discountCodeRepo: badRepo });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
