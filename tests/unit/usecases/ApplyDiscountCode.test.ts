import { describe, it, expect, vi, beforeEach } from "vitest";
import { Result } from "@/domain/shared/Result";
import { ApplyDiscountCode } from "@/usecases/ApplyDiscountCode";
import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import type { Clock } from "@/ports/system/Clock";
import type { DiscountCode } from "@/domain/entities/DiscountCode";

function makeCode(overrides: Partial<DiscountCode> = {}): DiscountCode {
  const now = new Date("2025-07-01T00:00:00Z");
  return {
    id: "dc_01",
    code: "SAVE20",
    type: "PERCENTAGE",
    value: 20,
    maxUses: null,
    usedCount: 0,
    validFrom: null,
    validUntil: null,
    courseIds: [],
    createdAt: now,
    ...overrides,
  } as DiscountCode;
}

const NOW = new Date("2025-07-01T00:00:00Z");

describe("ApplyDiscountCode", () => {
  let mockRepo: IDiscountCodeRepository;
  let mockClock: Clock;
  let useCase: ApplyDiscountCode;

  const CODE = "SAVE20";
  const COURSE_ID = "course_01";
  const SUBTOTAL_MINOR = 10000;

  beforeEach(() => {
    mockRepo = { findByCode: vi.fn(), create: vi.fn(), incrementUsedCount: vi.fn(), listAll: vi.fn(), findById: vi.fn(), update: vi.fn(), archive: vi.fn() };
    mockClock = { now: vi.fn(() => NOW) };
    useCase = new ApplyDiscountCode({ discountCodeRepo: mockRepo, clock: mockClock });
  });

  // ── happy path ───────────────────────────────────────────

  it("returns discount amount for valid PERCENTAGE code", async () => {
    const code = makeCode({ code: CODE, type: "PERCENTAGE", value: 20 });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discountMinor).toBe(2000); // 20% of 10000
    expect(result.value.discountCodeId).toBe("dc_01");
  });

  it("returns discount amount for valid FIXED code", async () => {
    const code = makeCode({ code: CODE, type: "FIXED", value: 5000 });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discountMinor).toBe(5000);
  });

  it("returns discount amount for code limited to specific courses (matches)", async () => {
    const code = makeCode({ code: CODE, courseIds: [COURSE_ID, "course_02"] });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discountMinor).toBe(2000);
  });

  it("caps FIXED discount at subtotalMinor", async () => {
    const code = makeCode({ code: CODE, type: "FIXED", value: 15000 });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.discountMinor).toBe(10000); // capped at subtotal
  });

  // ── error cases ──────────────────────────────────────────

  it("returns code_not_found when code does not exist", async () => {
    vi.mocked(mockRepo.findByCode).mockResolvedValue(null);

    const result = await useCase.execute({
      code: "INVALID",
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_not_found");
  });

  it("returns code_expired when validUntil is in past", async () => {
    const code = makeCode({
      validUntil: new Date("2025-06-30T00:00:00Z"),
    });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_expired");
  });

  it("returns code_not_started when validFrom is in future", async () => {
    const code = makeCode({
      validFrom: new Date("2025-08-01T00:00:00Z"),
    });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_not_started");
  });

  it("returns code_maxed_out when usedCount >= maxUses", async () => {
    const code = makeCode({ maxUses: 10, usedCount: 10 });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_maxed_out");
  });

  it("returns code_not_applicable when code has courseIds but this course not in list", async () => {
    const code = makeCode({ courseIds: ["course_other_1", "course_other_2"] });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    const result = await useCase.execute({
      code: CODE,
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("code_not_applicable");
  });

  it("case-insensitive code lookup", async () => {
    const code = makeCode({ code: "SAVE20" });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    // Pass lowercase — repo normalizes to uppercase
    const result = await useCase.execute({
      code: "save20",
      courseId: COURSE_ID,
      subtotalMinor: SUBTOTAL_MINOR,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(mockRepo.findByCode).toHaveBeenCalledWith("SAVE20");
  });

  it("uses clock for validity check", async () => {
    const code = makeCode({
      validUntil: new Date("2025-06-30T00:00:00Z"),
    });
    vi.mocked(mockRepo.findByCode).mockResolvedValue(code);

    await useCase.execute({ code: CODE, courseId: COURSE_ID, subtotalMinor: SUBTOTAL_MINOR });

    expect(mockClock.now).toHaveBeenCalled();
  });
});
