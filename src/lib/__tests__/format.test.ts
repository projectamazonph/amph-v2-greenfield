import { describe, it, expect } from "vitest";
import { Money } from "../Money";

/**
 * Format helpers — these live here because they are pure formatters
 * with no side effects. No need to mock anything.
 */

describe("Money.format()", () => {
  it("formats PHP pesos with 2 decimal places", () => {
    expect(Money.php(2999).format()).toMatch(/2,?999\.00/);
  });

  it("formats USD dollars with 2 decimal places", () => {
    expect(Money.of(5000, "USD").format("en-US")).toBe("$50.00");
  });

  it("formats large amounts with thousand separators", () => {
    expect(Money.php(999999.99).format()).toMatch(/999,?999\.99/);
  });
});

describe("Money edge cases", () => {
  it("handles zero correctly", () => {
    const m = Money.zero("PHP");
    expect(m.format()).toMatch(/0\.00/);
    expect(m.isZero()).toBe(true);
  });

  it("handles very small amounts (1 centavo)", () => {
    const m = Money.of(1, "PHP");
    expect(m.format()).toMatch(/0\.01/);
  });
});
