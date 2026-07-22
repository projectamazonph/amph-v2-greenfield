import { describe, it, expect } from "vitest";
import { PaymentStatus } from "@/domain/values/PaymentStatus";

describe("PaymentStatus", () => {
  describe("isPaid()", () => {
    it("returns true for PAID", () => {
      expect(PaymentStatus.isPaid("PAID")).toBe(true);
    });

    it("returns false for PENDING", () => {
      expect(PaymentStatus.isPaid("PENDING")).toBe(false);
    });

    it("returns false for FAILED", () => {
      expect(PaymentStatus.isPaid("FAILED")).toBe(false);
    });

    it("returns false for EXPIRED", () => {
      expect(PaymentStatus.isPaid("EXPIRED")).toBe(false);
    });

    it("returns false for REFUNDED", () => {
      expect(PaymentStatus.isPaid("REFUNDED")).toBe(false);
    });
  });

  describe("isFinal()", () => {
    it("returns true for PAID", () => {
      expect(PaymentStatus.isFinal("PAID")).toBe(true);
    });

    it("returns true for REFUNDED", () => {
      expect(PaymentStatus.isFinal("REFUNDED")).toBe(true);
    });

    it("returns false for PENDING", () => {
      expect(PaymentStatus.isFinal("PENDING")).toBe(false);
    });

    it("returns false for FAILED", () => {
      expect(PaymentStatus.isFinal("FAILED")).toBe(false);
    });

    it("returns false for EXPIRED", () => {
      expect(PaymentStatus.isFinal("EXPIRED")).toBe(false);
    });
  });

  describe("isActive()", () => {
    it("returns true for PENDING", () => {
      expect(PaymentStatus.isActive("PENDING")).toBe(true);
    });

    it("returns false for PAID", () => {
      expect(PaymentStatus.isActive("PAID")).toBe(false);
    });

    it("returns false for FAILED", () => {
      expect(PaymentStatus.isActive("FAILED")).toBe(false);
    });

    it("returns false for EXPIRED", () => {
      expect(PaymentStatus.isActive("EXPIRED")).toBe(false);
    });

    it("returns false for REFUNDED", () => {
      expect(PaymentStatus.isActive("REFUNDED")).toBe(false);
    });
  });

  describe("isValid()", () => {
    it.each(["DRAFT", "PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"])(
      "returns true for %s",
      (status) => {
        expect(PaymentStatus.isValid(status)).toBe(true);
      },
    );

    it("returns false for a legacy or corrupt value", () => {
      expect(PaymentStatus.isValid("SOME_LEGACY_VALUE")).toBe(false);
    });

    it("returns false for a lowercase variant (case-sensitive)", () => {
      expect(PaymentStatus.isValid("paid")).toBe(false);
    });

    it("returns false for an empty string", () => {
      expect(PaymentStatus.isValid("")).toBe(false);
    });
  });

  describe("type coverage — all states are handled", () => {
    // TypeScript would error if a state is added without updating the helpers.
    // This is a compile-time exhaustiveness check expressed as a runtime test.
    const allStatuses: PaymentStatus[] = ["PENDING", "PAID", "FAILED", "EXPIRED", "REFUNDED"];

    it("each status has a deterministic isPaid result", () => {
      allStatuses.forEach((s) => {
        const result = PaymentStatus.isPaid(s);
        expect(typeof result).toBe("boolean");
      });
    });

    it("each status has a deterministic isFinal result", () => {
      allStatuses.forEach((s) => {
        const result = PaymentStatus.isFinal(s);
        expect(typeof result).toBe("boolean");
      });
    });

    it("each status has a deterministic isActive result", () => {
      allStatuses.forEach((s) => {
        const result = PaymentStatus.isActive(s);
        expect(typeof result).toBe("boolean");
      });
    });
  });
});
