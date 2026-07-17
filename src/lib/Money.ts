/**
 * Money value object — immutable, always in integer minor units (centavos / cents).
 *
 * NEVER use a floating-point `number` to represent money. Floats accumulate
 * rounding errors: 0.1 + 0.2 !== 0.3. Always use this class.
 *
 * @example
 * ```ts
 * const price = Money.php(2999);        // ₱29.99
 * const discount = Money.php(500);     // ₱5.00
 * const final = price.subtract(discount);
 * final.format(); // "₱2,499.00"
 * ```
 */

/** Supported currencies. ADR-008: PHP only in v2. */
export type Currency = "PHP" | "USD";

export class Money {
  /** Integer minor units (centavos / cents). Never a float. */
  public readonly minor: number;
  public readonly currency: Currency;

  private constructor(minor: number, currency: Currency) {
    this.minor = minor;
    this.currency = currency;
  }

  // ── Factories ───────────────────────────────────────────

  /**
   * Construct from integer minor units.
   * @param minor  Integer — e.g. 299900 for ₱2,999.00
   * @param currency  The currency
   * @throws {Error} if minor is not an integer
   */
  static of(minor: number, currency: Currency): Money {
    if (!Number.isInteger(minor)) {
      throw new Error(
        `Money.of requires an integer minor amount. Got ${minor}. ` +
        "Use Money.php(pesos) for float-to-centavos conversion.",
      );
    }
    return new Money(minor, currency);
  }

  /**
   * Construct from pesos (converts to centavos automatically).
   * @param pesos  Float or integer — e.g. 29.99 → ₱29.99
   */
  static php(pesos: number): Money {
    return Money.of(Math.round(pesos * 100), "PHP");
  }

  /** Zero money. Valid (free tier, zero-price course). */
  static zero(currency: Currency): Money {
    return Money.of(0, currency);
  }

  // ── Arithmetic ────────────────────────────────────────────

  add(other: Money): Money {
    this._assertSameCurrency(other);
    return Money.of(this.minor + other.minor, this.currency);
  }

  subtract(other: Money): Money {
    this._assertSameCurrency(other);
    return Money.of(this.minor - other.minor, this.currency);
  }

  /** Multiply by a scalar (e.g. 0.5 for 50% discount). */
  multiply(factor: number): Money {
    return Money.of(Math.round(this.minor * factor), this.currency);
  }

  /** Percentage of this amount (e.g. `money.percent(15)` for a 15% fee). */
  percent(pct: number): Money {
    return Money.of(Math.round(this.minor * (pct / 100)), this.currency);
  }

  /** Is this amount greater than zero? */
  isPositive(): boolean {
    return this.minor > 0;
  }

  /** Is this amount zero? */
  isZero(): boolean {
    return this.minor === 0;
  }

  /** Is this amount negative? */
  isNegative(): boolean {
    return this.minor < 0;
  }

  // ── Comparison ───────────────────────────────────────────

  equals(other: Money): boolean {
    return this.minor === other.minor && this.currency === other.currency;
  }

  gt(other: Money): boolean {
    this._assertSameCurrency(other);
    return this.minor > other.minor;
  }

  gte(other: Money): boolean {
    this._assertSameCurrency(other);
    return this.minor >= other.minor;
  }

  lt(other: Money): boolean {
    this._assertSameCurrency(other);
    return this.minor < other.minor;
  }

  lte(other: Money): boolean {
    this._assertSameCurrency(other);
    return this.minor <= other.minor;
  }

  // ── Formatting ───────────────────────────────────────────

  /**
   * Format as a localized currency string.
   * @example
   * ```ts
   * Money.php(2999).format();     // "₱2,999.00"
   * Money.of(50000, "USD").format(); // "$500.00"
   * ```
   */
  format(locale = "en-PH"): string {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(this.minor / 100);
  }

  /** Raw minor amount. Use with caution — prefer Money.of() to reconstruct. */
  toMinor(): number {
    return this.minor;
  }

  // ── Internal ──────────────────────────────────────────────

  private _assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(
        `Currency mismatch: cannot operate on ${this.currency} and ${other.currency}. ` +
        "All money in the same operation must use the same currency.",
      );
    }
  }
}
