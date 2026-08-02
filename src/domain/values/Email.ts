/**
 * Email value — validated, normalized email address string.
 *
 * The domain (and every downstream layer) still stores emails as a plain
 * `string` — this is a validation/normalization helper, not a wrapper
 * class like Money. It replaces the previous `email.includes("@")`-style
 * checks used across SignUp/Login/RequestPasswordReset with one shared,
 * RFC 5321/5322-informed check (local part ≤ 64 chars, total ≤ 254
 * chars, no catastrophic-backtracking regex).
 *
 * @example
 * ```ts
 * const result = createEmail("  Alice@Example.com ");
 * if (Result.isOk(result)) result.value; // "alice@example.com"
 * ```
 */

import { Result } from "@/domain/shared/Result";

export type EmailError =
  | { kind: "empty" }
  | { kind: "too_long" }
  | { kind: "local_part_too_long" }
  | { kind: "invalid_format" };

// Deliberately simple and linear-time (no nested quantifiers) to avoid
// ReDoS. Not a full RFC 5322 grammar — practical subset: one "@", no
// whitespace, a dot-separated domain with a TLD of at least 2 letters.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const MAX_TOTAL_LENGTH = 254; // RFC 5321 §4.5.3.1.3
const MAX_LOCAL_PART_LENGTH = 64; // RFC 5321 §4.5.3.1.1

/**
 * Validate and normalize a raw email string.
 * @returns `Result.ok(normalizedEmail)` (trimmed, lowercased) or a
 *   `Result.err` describing which rule failed.
 */
export function createEmail(raw: string): Result<string, EmailError> {
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    return Result.err({ kind: "empty" });
  }
  if (trimmed.length > MAX_TOTAL_LENGTH) {
    return Result.err({ kind: "too_long" });
  }

  const atIndex = trimmed.indexOf("@");
  if (atIndex > MAX_LOCAL_PART_LENGTH) {
    return Result.err({ kind: "local_part_too_long" });
  }

  if (!EMAIL_PATTERN.test(trimmed)) {
    return Result.err({ kind: "invalid_format" });
  }

  return Result.ok(trimmed.toLowerCase());
}

/** Convenience boolean check for call sites that don't need the error kind. */
export function isValidEmail(raw: string): boolean {
  return Result.isOk(createEmail(raw));
}
