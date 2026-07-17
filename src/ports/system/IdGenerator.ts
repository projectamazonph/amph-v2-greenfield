/**
 * IdGenerator port — the single abstraction for "generate a new ID".
 *
 * Business logic must not call `crypto.randomUUID()` or `cuid()` directly.
 * Inject this port instead. This makes IDs testable and swappable.
 *
 * Uses ULIDs: sortable, URL-safe, 26 characters, no external dependency.
 * See https://github.com/ulid/spec
 */

/** Generates IDs for various domains. */
export interface IdGenerator {
  /** General-purpose sortable unique ID. */
  newId(): string;

  /**
   * Payment reference — prefixed for human readability in PayMongo.
   * Format: `AMPH-{ulid}` — sortable, unique, short.
   */
  paymentRef(): string;

  /**
   * Receipt number — prefixed, year-prefixed for filing.
   * Format: `AMPH-{YYYY}-{sequential}` — e.g. `AMPH-2026-000123`
   */
  receiptNumber(): string;
}
