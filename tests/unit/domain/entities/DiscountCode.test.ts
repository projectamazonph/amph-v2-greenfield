import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createDiscountCode,
  discountCodeIsValid,
  calculateDiscount,
  type DiscountCode,
  type DiscountType,
} from "@/domain/entities/DiscountCode";

function makeCode(overrides: Partial<{
  code: string;
  type: DiscountType;
  value: number;
  maxUses: number | null;
  usedCount: number;
  validFrom: Date | null;
  validUntil: Date | null;
  courseIds: readonly string[];
}> = {}): DiscountCode {
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

describe("DiscountCode entity", () => {
  describe("createDiscountCode", () => {
    it("creates PERCENTAGE discount code with defaults", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "SAVE20",
        type: "PERCENTAGE",
        value: 20,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.code).toBe("SAVE20");
      expect(result.value.type).toBe("PERCENTAGE");
      expect(result.value.value).toBe(20);
      expect(result.value.maxUses).toBeNull();
      expect(result.value.usedCount).toBe(0);
      expect(result.value.validFrom).toBeNull();
      expect(result.value.validUntil).toBeNull();
      expect(result.value.courseIds).toEqual([]);
    });

    it("creates FIXED discount code", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "PHP100OFF",
        type: "FIXED",
        value: 10000,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.type).toBe("FIXED");
      expect(result.value.value).toBe(10000);
    });

    it("rejects empty code", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "",
        type: "PERCENTAGE",
        value: 20,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_code");
    });

    it("rejects code with invalid characters", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "SAVE 20!",
        type: "PERCENTAGE",
        value: 20,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_code");
    });

    it("rejects PERCENTAGE value of 0", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "ZERO",
        type: "PERCENTAGE",
        value: 0,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_value");
    });

    it("rejects PERCENTAGE value > 100", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "TOOHIGH",
        type: "PERCENTAGE",
        value: 101,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_value");
    });

    it("rejects PERCENTAGE value < 0", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "NEGATIVE",
        type: "PERCENTAGE",
        value: -5,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_value");
    });

    it("rejects FIXED value of 0", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "FREE",
        type: "FIXED",
        value: 0,
      });

      if (!Result.isErr(result)) throw new Error("expected err");
      expect(result.error.kind).toBe("invalid_value");
    });

    it("accepts maxUses with valid value", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "LIMITED",
        type: "PERCENTAGE",
        value: 10,
        maxUses: 100,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.maxUses).toBe(100);
    });

    it("stores courseIds", () => {
      const result = createDiscountCode({
        id: "dc_01",
        code: "COURSEONLY",
        type: "PERCENTAGE",
        value: 15,
        courseIds: ["course_01", "course_02"],
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.courseIds).toEqual(["course_01", "course_02"]);
    });

    it("stores validFrom and validUntil", () => {
      const from = new Date("2025-07-01");
      const until = new Date("2025-12-31");
      const result = createDiscountCode({
        id: "dc_01",
        code: "SUMMER",
        type: "PERCENTAGE",
        value: 25,
        validFrom: from,
        validUntil: until,
      });

      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.validFrom).toBe(from);
      expect(result.value.validUntil).toBe(until);
    });
  });

  describe("discountCodeIsValid", () => {
    it("active code is valid", () => {
      const code = makeCode();
      expect(discountCodeIsValid(code, NOW)).toBe(true);
    });

    it("expired code (validUntil in past) is invalid", () => {
      const code = makeCode({
        validUntil: new Date("2025-06-30T00:00:00Z"), // yesterday
      });
      expect(discountCodeIsValid(code, NOW)).toBe(false);
    });

    it("code not yet started (validFrom in future) is invalid", () => {
      const code = makeCode({
        validFrom: new Date("2025-08-01T00:00:00Z"), // tomorrow
      });
      expect(discountCodeIsValid(code, NOW)).toBe(false);
    });

    it("maxed out code (usedCount >= maxUses) is invalid", () => {
      const code = makeCode({
        maxUses: 10,
        usedCount: 10,
      });
      expect(discountCodeIsValid(code, NOW)).toBe(false);
    });

    it("maxed out code with unlimited maxUses is valid", () => {
      const code = makeCode({
        maxUses: null,
        usedCount: 999,
      });
      expect(discountCodeIsValid(code, NOW)).toBe(true);
    });

    it("valid code within window with remaining uses is valid", () => {
      const code = makeCode({
        validFrom: new Date("2025-06-01"),
        validUntil: new Date("2025-08-01"),
        maxUses: 100,
        usedCount: 50,
      });
      expect(discountCodeIsValid(code, NOW)).toBe(true);
    });

    it("valid code exactly at maxUses - 1 is valid", () => {
      const code = makeCode({
        maxUses: 10,
        usedCount: 9,
      });
      expect(discountCodeIsValid(code, NOW)).toBe(true);
    });
  });

  describe("calculateDiscount", () => {
    it("PERCENTAGE: 10% of 10000 = 1000", () => {
      const code = makeCode({ type: "PERCENTAGE", value: 10 });
      expect(calculateDiscount(code, 10000)).toBe(1000);
    });

    it("PERCENTAGE: 20% of 5000 = 1000", () => {
      const code = makeCode({ type: "PERCENTAGE", value: 20 });
      expect(calculateDiscount(code, 5000)).toBe(1000);
    });

    it("PERCENTAGE: rounds down to nearest integer", () => {
      const code = makeCode({ type: "PERCENTAGE", value: 33 });
      // 33% of 1000 = 330
      expect(calculateDiscount(code, 1000)).toBe(330);
    });

    it("FIXED: 5000 off 10000 = 5000", () => {
      const code = makeCode({ type: "FIXED", value: 5000 });
      expect(calculateDiscount(code, 10000)).toBe(5000);
    });

    it("FIXED: capped at subtotal — 5000 off 1000 = 1000", () => {
      const code = makeCode({ type: "FIXED", value: 5000 });
      expect(calculateDiscount(code, 1000)).toBe(1000);
    });

    it("FIXED: exactly subtotal = subtotal", () => {
      const code = makeCode({ type: "FIXED", value: 1000 });
      expect(calculateDiscount(code, 1000)).toBe(1000);
    });

    it("PERCENTAGE: 100% = full subtotal", () => {
      const code = makeCode({ type: "PERCENTAGE", value: 100 });
      expect(calculateDiscount(code, 10000)).toBe(10000);
    });
  });
});
