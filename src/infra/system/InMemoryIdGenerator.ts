/**
 * Deterministic ID generator for tests.
 *
 * Produces predictable, incrementing IDs so test runs are reproducible.
 * IDs are ULID-shaped (26 chars, lowercase) but sequential.
 *
 * @example
 * ```ts
 * const ids = new InMemoryIdGenerator("test");
 * ids.newId(); // "00000000000000000000000001"
 * ids.newId(); // "00000000000000000000000002"
 * ids.paymentRef(); // "AMPH-00000000000000000000000003"
 * ids.receiptNumber(); // "AMPH-2026-000004"
 * ```
 */
export class InMemoryIdGenerator {
  private _counter = 0;
  private _prefix: string;

  constructor(prefix = "test") {
    this._prefix = prefix;
  }

  newId(): string {
    const seq = String(++this._counter).padStart(26, "0");
    return seq;
  }

  paymentRef(): string {
    return `AMPH-${this.newId()}`;
  }

  receiptNumber(): string {
    return `AMPH-2026-${String(++this._counter).padStart(6, "0")}`;
  }

  reset(): void {
    this._counter = 0;
  }
}
