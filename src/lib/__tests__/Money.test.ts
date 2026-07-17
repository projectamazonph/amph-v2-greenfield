import { describe, it, expect } from "vitest";
import { Money } from "../Money";

describe("Money", () => {
  describe("construction", () => {
    it("Money.of takes integer minor units", () => {
      const m = Money.of(299900, "PHP");
      expect(m.toMinor()).toBe(299900);
      expect(m.currency).toBe("PHP");
    });

    it("Money.of rejects non-integer minor units (NO FLOATING POINT)", () => {
      expect(() => Money.of(2999.99, "PHP")).toThrow(/integer/);
      expect(() => Money.of(NaN, "PHP")).toThrow(/integer/);
      expect(() => Money.of(Infinity, "PHP")).toThrow(/integer/);
    });

    it("Money.php converts pesos to centavos", () => {
      const m = Money.php(2999.99);
      expect(m.toMinor()).toBe(299999);
    });

    it("Money.php rounds half-to-even properly (banker's rounding not used; uses round-half-away)", () => {
      // Math.round rounds 0.5 up
      expect(Money.php(0.005).toMinor()).toBe(1); // 0.5 cents → 1 cent
      expect(Money.php(0.015).toMinor()).toBe(2); // 1.5 cents → 2 cents
    });

    it("Money.zero is 0 in the given currency", () => {
      const m = Money.zero("PHP");
      expect(m.toMinor()).toBe(0);
      expect(m.isZero()).toBe(true);
    });
  });

  describe("arithmetic", () => {
    it("add returns a new Money with summed minor units", () => {
      const a = Money.php(100);
      const b = Money.php(50);
      const c = a.add(b);
      expect(c.toMinor()).toBe(15000);
      expect(a.toMinor()).toBe(10000); // immutable
    });

    it("subtract returns a new Money with difference", () => {
      const a = Money.php(100);
      const b = Money.php(30);
      expect(a.subtract(b).toMinor()).toBe(7000);
    });

    it("add/subtract require same currency", () => {
      const php = Money.php(100);
      const usd = Money.of(10000, "USD");
      expect(() => php.add(usd)).toThrow(/PHP.*USD/);
      expect(() => php.subtract(usd)).toThrow(/PHP.*USD/);
    });

    it("multiply by integer factor is exact", () => {
      const m = Money.php(10);
      expect(m.multiply(3).toMinor()).toBe(3000);
    });

    it("multiply by fractional factor rounds to nearest centavo", () => {
      const m = Money.php(10);
      // 0.5x = ₱5.00 = 500 centavos (exact)
      expect(m.multiply(0.5).toMinor()).toBe(500);
      // 0.333x = ₱3.33 = 333 centavos (rounded from 3.33)
      expect(m.multiply(0.333).toMinor()).toBe(333);
    });

    it("percent(pct) computes percentage of amount", () => {
      const price = Money.php(100); // ₱100
      const fee = price.percent(5); // 5% = ₱5
      expect(fee.toMinor()).toBe(500);
    });
  });

  describe("comparison", () => {
    it("equals", () => {
      expect(Money.php(100).equals(Money.php(100))).toBe(true);
      expect(Money.php(100).equals(Money.php(101))).toBe(false);
      expect(Money.php(100).equals(Money.of(10000, "USD"))).toBe(false);
    });

    it("gt / gte / lt / lte", () => {
      const a = Money.php(100);
      const b = Money.php(50);
      expect(a.gt(b)).toBe(true);
      expect(a.gte(b)).toBe(true);
      expect(b.lt(a)).toBe(true);
      expect(b.lte(a)).toBe(true);
      expect(a.gt(a)).toBe(false);
      expect(a.gte(a)).toBe(true);
    });
  });

  describe("predicates", () => {
    it("isPositive / isZero / isNegative", () => {
      expect(Money.php(100).isPositive()).toBe(true);
      expect(Money.zero("PHP").isZero()).toBe(true);
      expect(Money.php(-50).isNegative()).toBe(true);
      expect(Money.php(0).isPositive()).toBe(false);
    });
  });

  describe("formatting", () => {
    it("format() outputs the currency string for en-PH locale", () => {
      const m = Money.php(2999);
      const formatted = m.format();
      // Intl may use ₱ or PHP symbol depending on locale
      expect(formatted).toMatch(/2,?999\.00/);
    });

    it("format() outputs USD format when currency is USD", () => {
      const m = Money.of(50000, "USD");
      const formatted = m.format("en-US");
      expect(formatted).toBe("$500.00");
    });
  });

  describe("the famous floating-point bug is impossible", () => {
    it("0.1 + 0.2 = 0.3 in money arithmetic (this is the whole point of the class)", () => {
      // In raw float, 0.1 + 0.2 = 0.30000000000000004
      const a = Money.php(0.1);
      const b = Money.php(0.2);
      const sum = a.add(b);
      expect(sum.equals(Money.php(0.3))).toBe(true);
    });
  });
});
