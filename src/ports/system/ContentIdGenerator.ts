/**
 * ContentIdGenerator — port for stable, deterministic ID generation
 * based on curriculum content slugs.
 *
 * Unlike IdGenerator (which generates random ULIDs), this port produces
 * the same ID for the same input every time. This makes the import
 * script idempotent: re-running produces the same Module/Lesson IDs
 * as the first run, so existing rows are upserted rather than duplicated.
 *
 * STORY-013.
 */

/** Returns a deterministic hash string for the given inputs. */
export interface ContentIdGenerator {
  /**
   * Generate a stable ID from one or more string components.
   * The result is deterministic: same inputs → same output forever.
   */
  generateId(...parts: string[]): string;
}
