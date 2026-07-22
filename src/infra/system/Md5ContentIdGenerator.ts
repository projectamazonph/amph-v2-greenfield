/**
 * Md5ContentIdGenerator — production adapter for ContentIdGenerator.
 *
 * Produces stable, deterministic IDs using MD5 hashing of the input
 * parts. Same inputs always produce the same output, making content
 * imports idempotent (re-runs upsert rather than duplicate).
 *
 * STORY-013.
 */

import { createHash } from "node:crypto";
import type { ContentIdGenerator } from "@/ports/system/ContentIdGenerator";

export class Md5ContentIdGenerator implements ContentIdGenerator {
  generateId(...parts: string[]): string {
    const input = parts.join(":");
    return createHash("md5").update(input).digest("hex");
  }
}
