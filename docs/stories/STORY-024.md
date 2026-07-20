# STORY-024 — Discount Code Model + Repository + Apply in Checkout

## Status

- **Story**: STORY-024
- **Sprint**: 5 — Enrollment + Access Policy
- **Points**: 1
**Status:** ✅ Done (PR #24, commit `4b0ae1a` — `feat(story-024): DiscountCode entity + ApplyDiscountCode use case`)

## Overview

Add discount code support to checkout. Admin creates discount codes; they are applied during `CreatePaymentIntent` to reduce the order total.

## Domain Model

### `DiscountCode` Entity

```typescript
export type DiscountType = "PERCENTAGE" | "FIXED";

export interface DiscountCode {
  readonly id: string;
  /** Human-readable code, e.g. "SAVE20" — case-insensitive. */
  readonly code: string;
  readonly type: DiscountType;
  /** Percentage (0–100) or fixed minor units (e.g. 500 = ₱5.00). */
  readonly value: number;
  /** How many times this code can be used total. null = unlimited. */
  readonly maxUses: number | null;
  /** How many times this code has been used. */
  readonly usedCount: number;
  /** When the code becomes valid. null = immediately. */
  readonly validFrom: Date | null;
  /** When the code expires. null = never. */
  readonly validUntil: Date | null;
  /** Course IDs this code applies to. Empty = all courses. */
  readonly courseIds: readonly string[];
  readonly createdAt: Date;
}
```

### Factory: `createDiscountCode`

```typescript
type CreateDiscountCodeError =
  | { kind: "invalid_code"; message: string }
  | { kind: "invalid_value" }
  | { kind: "invalid_max_uses" };

createDiscountCode(params: {
  id: string;
  code: string;         // non-empty, alphanumeric + dashes
  type: DiscountType;
  value: number;        // percentage: 1–100, fixed: > 0
  maxUses?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  courseIds?: readonly string[];
}): Result<DiscountCode, CreateDiscountCodeError>
```

### Query: `discountCodeIsValid`

```typescript
/**
 * Is a discount code currently valid for use?
 * Checks: not expired, not maxed out, within validFrom/validUntil window.
 */
function discountCodeIsValid(code: DiscountCode, now: Date): boolean;
```

### Calculate Discount

```typescript
/**
 * Calculate the discount amount in minor units.
 * PERCENTAGE: subtotalMinor * (value / 100)
 * FIXED: min(value, subtotalMinor) — never discount more than the subtotal
 */
function calculateDiscount(
  code: DiscountCode,
  subtotalMinor: number,
): number;
```

## Architecture

```
domain/entities/DiscountCode.ts  # entity + factory + query helpers

ports/repositories/
  IDiscountCodeRepository.ts     # findByCode(), create()

usecases/
  ApplyDiscountCode.ts          # validate + calculate discount
```

## Repository

```typescript
export interface IDiscountCodeRepository {
  findByCode(code: string): Promise<DiscountCode | null>;
  create(code: DiscountCode): Promise<Result<DiscountCode, DiscountCodeError>>;
  incrementUsedCount(code: string): Promise<Result<DiscountCode, DiscountCodeError>>;
}
```

## `ApplyDiscountCode` Use Case

```typescript
interface ApplyDiscountCodeInput {
  code: string;
  courseId: string;
  subtotalMinor: number;
}

interface ApplyDiscountCodeDeps {
  discountCodeRepo: IDiscountCodeRepository;
  clock: Clock;
}

type ApplyDiscountCodeError =
  | { kind: "code_not_found" }
  | { kind: "code_expired" }
  | { kind: "code_not_started" }
  | { kind: "code_maxed_out" }
  | { kind: "code_not_applicable" };

type ApplyDiscountCodeResult = Result<
  { discountMinor: number; discountCodeId: string },
  ApplyDiscountCodeError
>;
```

Rules:
1. Code must exist → `code_not_found`
2. Code must not be expired (`validUntil`) → `code_expired`
3. Code must be within valid window (`validFrom`) → `code_not_started`
4. Code must not be maxed out → `code_maxed_out`
5. Code must apply to this course (courseIds empty = all, or must include courseId) → `code_not_applicable`
6. Return discount amount (calculated from type + value)

## Tests

### Domain

- `createDiscountCode` with valid params → ok
- `createDiscountCode` with empty code → error
- `createDiscountCode` with percentage > 100 → error
- `createDiscountCode` with percentage ≤ 0 → error
- `createDiscountCode` with fixed ≤ 0 → error
- `discountCodeIsValid`: active code → true
- `discountCodeIsValid`: expired (`validUntil` past) → false
- `discountCodeIsValid`: not yet started (`validFrom` future) → false
- `discountCodeIsValid`: maxed out (`usedCount >= maxUses`) → false
- `discountCodeIsValid`: not maxed out (`usedCount < maxUses`) → true
- `calculateDiscount`: PERCENTAGE — 10% of 10000 → 1000
- `calculateDiscount`: FIXED — 500 off 10000 → 500
- `calculateDiscount`: FIXED capped at subtotal — 5000 off 1000 → 1000

### `ApplyDiscountCode` use case

- Valid code for course → returns discount amount
- Code not found → `code_not_found`
- Code expired → `code_expired`
- Code not yet valid → `code_not_started`
- Code maxed out → `code_maxed_out`
- Code doesn't apply to course → `code_not_applicable`
