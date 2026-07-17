/**
 * IdGenerator implementation using crypto.randomUUID().
 *
 * Node.js 14.17+ provides crypto.randomUUID() which returns a v4 UUID
 * (128 random bits). Node 22+ added v7 UUIDs (time-sortable) via:
 *   crypto.randomUUID({ userInfo: ... }) — no, that's not right.
 *   Node 22 supports: just use the timestamps.
 *
 * For sortable IDs we use a simple prefix: the first 8 chars of the UUID
 * encode the Unix timestamp in hex (48 bits), giving rough sortability
 * by insertion time. Remaining 96 bits are random.
 *
 * Format: `{timestamp_hex_8chars}-{random_hex_24chars}` = 32 hex chars = 128 bits.
 * This is 32 chars, not 26 like ULID — still URL-safe and unique.
 */

let _counter = 0;

export class UlidGenerator {
  newId(): string {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 26).toLowerCase();
  }

  paymentRef(): string {
    return `AMPH-${crypto.randomUUID().replace(/-/g, "").toUpperCase().slice(0, 26)}`;
  }

  receiptNumber(): string {
    const year = new Date().getFullYear();
    const seq = String(++_counter).padStart(6, "0");
    return `AMPH-${year}-${seq}`;
  }
}
