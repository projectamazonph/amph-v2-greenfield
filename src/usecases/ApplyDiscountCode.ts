/**
 * ApplyDiscountCode — validate and calculate a discount code's value at checkout.
 *
 * STORY-024: Discount code model + repository + apply in checkout.
 *
 * This is a read-only validation step. The discount is applied to the order
 * by the `CreatePaymentIntent` use case (which will be updated in STORY-025).
 *
 * Steps:
 *  1. Find discount code (case-insensitive)
 *  2. Check validity: not expired, within window, not maxed out
 *  3. Check course applicability: courseIds empty = all, or must include courseId
 *  4. Calculate and return discount amount
 *
 * Fail Fast: typed errors returned early.
 */

import { Result } from "@/domain/shared/Result";
import { discountCodeIsValid, calculateDiscount } from "@/domain/entities/DiscountCode";
import type { IDiscountCodeRepository } from "@/ports/repositories/IDiscountCodeRepository";
import type { Clock } from "@/ports/system/Clock";

export interface ApplyDiscountCodeInput {
  code: string;
  courseId: string;
  subtotalMinor: number;
}

export interface ApplyDiscountCodeDeps {
  discountCodeRepo: IDiscountCodeRepository;
  clock: Clock;
}

export type ApplyDiscountCodeError =
  | { kind: "code_not_found" }
  | { kind: "code_expired" }
  | { kind: "code_not_started" }
  | { kind: "code_maxed_out" }
  | { kind: "code_not_applicable" };

export type ApplyDiscountCodeResult = Result<
  { discountMinor: number; discountCodeId: string },
  ApplyDiscountCodeError
>;

export class ApplyDiscountCode {
  constructor(private readonly deps: ApplyDiscountCodeDeps) {}

  async execute(input: ApplyDiscountCodeInput): Promise<ApplyDiscountCodeResult> {
    const { discountCodeRepo, clock } = this.deps;

    // ── 1. Find discount code (case-insensitive) ───────────
    const normalizedCode = input.code.trim().toUpperCase();
    const code = await discountCodeRepo.findByCode(normalizedCode);

    if (code === null) {
      return Result.err({ kind: "code_not_found" });
    }

    const now = clock.now();

    // ── 2. Check validity ──────────────────────────────────
    // Expired
    if (code.validUntil !== null && code.validUntil <= now) {
      return Result.err({ kind: "code_expired" });
    }

    // Not yet started
    if (code.validFrom !== null && code.validFrom > now) {
      return Result.err({ kind: "code_not_started" });
    }

    // Maxed out
    if (code.maxUses !== null && code.usedCount >= code.maxUses) {
      return Result.err({ kind: "code_maxed_out" });
    }

    // ── 3. Check course applicability ──────────────────────
    // Empty courseIds = applies to all courses
    // Non-empty = must include the courseId
    if (code.courseIds.length > 0 && !code.courseIds.includes(input.courseId)) {
      return Result.err({ kind: "code_not_applicable" });
    }

    // ── 4. Calculate discount ──────────────────────────────
    const discountMinor = calculateDiscount(code, input.subtotalMinor);

    return Result.ok({
      discountMinor,
      discountCodeId: code.id,
    });
  }
}
