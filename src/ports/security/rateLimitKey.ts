import { createHash } from "node:crypto";

/**
 * Builds a namespaced, non-PII Redis key for a rate-limit dimension.
 */
export function rateLimitKey(namespace: string, dimension: string): string {
  const digest = createHash("sha256").update(dimension.trim().toLowerCase()).digest("hex");
  return `amph:${namespace}:${digest}`;
}
