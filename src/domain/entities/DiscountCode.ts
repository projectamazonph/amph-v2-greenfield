/**
 * DiscountCode — a promotional discount code that can be applied at checkout.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 *
 * Immutable domain object. Created by `createDiscountCode`.
 * Discount calculations via `calculateDiscount`.
 * Validity checks via `discountCodeIsValid`.
 */

import { Result } from "@/domain/shared/Result";

export type DiscountType = "PERCENTAGE" | "FIXED";

export interface DiscountCode {
  readonly id: string;
  /** Uppercase code, e.g. "SAVE20". */
  readonly code: string;
  readonly type: DiscountType;
  /**
   * Percentage (1–100) or fixed minor units (e.g. 10000 = ₱100.00).
   * Meaning depends on `type`.
   */
  readonly value: number;
  /** Max uses total. null = unlimited. */
  readonly maxUses: number | null;
  /** How many times this code has been used. */
  readonly usedCount: number;
  /** When the code becomes valid. null = immediately. */
  readonly validFrom: Date | null;
  /** When the code expires. null = never. */
  readonly validUntil: Date | null;
  /**
   * Course IDs this code applies to.
   * Empty = applies to all courses.
   * Non-empty = only these course IDs.
   */
  readonly courseIds: readonly string[];
  readonly createdAt: Date;
}

export type CreateDiscountCodeError =
  | { kind: "invalid_code"; message: string }
  | { kind: "invalid_value" }
  | { kind: "invalid_max_uses" };

/** Valid code characters: uppercase letters, digits, dashes, underscores. */
const VALID_CODE = /^[A-Z0-9_-]+$/;

/**
 * Create a DiscountCode domain object.
 *
 * Code is normalized to uppercase.
 * PERCENTAGE values must be 1–100.
 * FIXED values must be > 0.
 */
export function createDiscountCode(params: {
  id: string;
  code: string;
  type: DiscountType;
  value: number;
  maxUses?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  courseIds?: readonly string[];
  createdAt?: Date;
}): Result<DiscountCode, CreateDiscountCodeError> {
  // ── Code validation ─────────────────────────────────────
  const normalizedCode = params.code.trim().toUpperCase();
  if (!normalizedCode) {
    return Result.err({ kind: "invalid_code", message: "Code cannot be empty." });
  }
  if (!VALID_CODE.test(normalizedCode)) {
    return Result.err({
      kind: "invalid_code",
      message: "Code may only contain letters, numbers, dashes, and underscores.",
    });
  }

  // ── Value validation ─────────────────────────────────────
  if (params.type === "PERCENTAGE") {
    if (params.value <= 0 || params.value > 100) {
      return Result.err({ kind: "invalid_value" });
    }
  } else {
    if (params.value <= 0) {
      return Result.err({ kind: "invalid_value" });
    }
  }

  // ── maxUses validation ───────────────────────────────────
  if (params.maxUses !== null && params.maxUses !== undefined && params.maxUses < 0) {
    return Result.err({ kind: "invalid_max_uses" });
  }

  return Result.ok({
    id: params.id,
    code: normalizedCode,
    type: params.type,
    value: params.value,
    maxUses: params.maxUses ?? null,
    usedCount: 0,
    validFrom: params.validFrom ?? null,
    validUntil: params.validUntil ?? null,
    courseIds: Object.freeze([...(params.courseIds ?? [])]),
    createdAt: params.createdAt ?? new Date(),
  });
}

export type UpdateDiscountCodeError =
  | { kind: "invalid_code"; message: string }
  | { kind: "invalid_value" }
  | { kind: "invalid_max_uses" };

export type UpdateDiscountCodePatch = Partial<
  Pick<
    DiscountCode,
    "code" | "type" | "value" | "maxUses" | "validFrom" | "validUntil" | "courseIds"
  >
> & { maxUses?: number | null; validFrom?: Date | null; validUntil?: Date | null };

/**
 * Update an existing DiscountCode (immutable — returns a new instance).
 */
export function updateDiscountCode(
  original: DiscountCode,
  patch: UpdateDiscountCodePatch,
): Result<DiscountCode, UpdateDiscountCodeError> {
  const errors: UpdateDiscountCodeError[] = [];

  const code = patch.code !== undefined ? patch.code.trim().toUpperCase() : original.code;
  if (!code) {
    errors.push({ kind: "invalid_code", message: "Code cannot be empty." });
  } else if (!VALID_CODE.test(code)) {
    errors.push({ kind: "invalid_code", message: "Code may only contain letters, numbers, dashes, and underscores." });
  }

  const type = patch.type ?? original.type;
  const value = patch.value ?? original.value;
  if (type === "PERCENTAGE" && (value < 1 || value > 100)) {
    errors.push({ kind: "invalid_value" });
  } else if (type === "FIXED" && value <= 0) {
    errors.push({ kind: "invalid_value" });
  }

  const maxUses = patch.maxUses !== undefined ? patch.maxUses ?? null : original.maxUses;
  if (maxUses !== null && maxUses < 0) {
    errors.push({ kind: "invalid_max_uses" });
  }

  if (errors.length > 0) return { ok: false, error: errors[0]! };

  return {
    ok: true,
    value: Object.freeze({
      ...original,
      code,
      type,
      value,
      maxUses,
      validFrom: patch.validFrom !== undefined ? (patch.validFrom ?? null) : original.validFrom,
      validUntil: patch.validUntil !== undefined ? (patch.validUntil ?? null) : original.validUntil,
      courseIds: Object.freeze([...(patch.courseIds ?? original.courseIds)]),
    }),
  };
}

/**
 * Is a discount code currently valid for use?
 *
 * Checks:
 * - `validUntil` must not be in the past
 * - `validFrom` must not be in the future
 * - `usedCount < maxUses` (if maxUses is set)
 */
export function discountCodeIsValid(code: DiscountCode, now: Date): boolean {
  // Check expiry
  if (code.validUntil !== null && code.validUntil <= now) {
    return false;
  }
  // Check not yet started
  if (code.validFrom !== null && code.validFrom > now) {
    return false;
  }
  // Check usage limit
  if (code.maxUses !== null && code.usedCount >= code.maxUses) {
    return false;
  }
  return true;
}

/**
 * Calculate the discount amount in minor units.
 *
 * PERCENTAGE: subtotalMinor × (value / 100), rounded down.
 * FIXED: min(value, subtotalMinor) — never discounts more than the order subtotal.
 */
export function calculateDiscount(code: DiscountCode, subtotalMinor: number): number {
  if (code.type === "PERCENTAGE") {
    return Math.floor((subtotalMinor * code.value) / 100);
  }
  // FIXED — never discount more than the subtotal
  return Math.min(code.value, subtotalMinor);
}
