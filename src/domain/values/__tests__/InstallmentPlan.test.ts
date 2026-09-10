/**
 * InstallmentPlan tests — P0-01 (P4 PR-B).
 *
 * Covers every branch: valid tenures, rejected tenures, the PayMongo
 * floor (including the exact boundary), non-integer amounts, and the
 * remainder schedule invariant.
 */

import { describe, expect, it } from "vitest";
import { INSTALLMENT_MINIMUM_MINOR, InstallmentPlan } from "@/domain/values/InstallmentPlan";

describe("InstallmentPlan", () => {
  it.each([3, 6, 12])("accepts a %i-month tenure", (months) => {
    const result = InstallmentPlan.create({ totalMinor: 600_000, months });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.months).toBe(months);
      expect(result.value.totalMinor).toBe(600_000);
    }
  });

  it.each([0, 1, 2, 5, 9, 13, 24])("rejects a %i-month tenure", (months) => {
    const result = InstallmentPlan.create({ totalMinor: 600_000, months });
    expect(result).toEqual({
      ok: false,
      error: { kind: "invalid_term", months },
    });
  });

  it("rejects amounts below the PayMongo floor", () => {
    const result = InstallmentPlan.create({
      totalMinor: INSTALLMENT_MINIMUM_MINOR - 1,
      months: 3,
    });
    expect(result).toEqual({
      ok: false,
      error: {
        kind: "below_minimum",
        totalMinor: INSTALLMENT_MINIMUM_MINOR - 1,
        minimumMinor: INSTALLMENT_MINIMUM_MINOR,
      },
    });
  });

  it("accepts the exact floor amount", () => {
    const result = InstallmentPlan.create({ totalMinor: INSTALLMENT_MINIMUM_MINOR, months: 3 });
    expect(result.ok).toBe(true);
  });

  it("rejects non-integer amounts", () => {
    const result = InstallmentPlan.create({ totalMinor: 300_000.5, months: 3 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("below_minimum");
  });

  it("splits evenly with no remainder", () => {
    const result = InstallmentPlan.create({ totalMinor: 600_000, months: 6 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.monthlyMinor).toBe(100_000);
      expect(result.value.firstMonthMinor).toBe(100_000);
      expect(result.value.schedule()).toEqual([
        100_000, 100_000, 100_000, 100_000, 100_000, 100_000,
      ]);
    }
  });

  it("puts the remainder on the first month", () => {
    const result = InstallmentPlan.create({ totalMinor: 1_000_000, months: 3 });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.monthlyMinor).toBe(333_333);
      expect(result.value.firstMonthMinor).toBe(333_334);
      const schedule = result.value.schedule();
      expect(schedule).toHaveLength(3);
      expect(schedule.reduce((sum, amount) => sum + amount, 0)).toBe(1_000_000);
    }
  });
});
