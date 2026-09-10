/**
 * InstallmentPlan — P0-01 (P4 PR-B).
 *
 * Card-installment rules for PayMongo checkout. PayMongo exposes the
 * installment choice on its hosted page via
 * `payment_method_options.card.installments`; our side only records
 * which tenure the student picked and validates it before creating
 * the checkout session.
 *
 * Rules (from PayMongo's payment-acceptance key concepts):
 * - Allowed tenures: 3, 6, 12 months. Anything else is rejected here
 *   so PayMongo never sees a term the hosted page cannot offer.
 * - Card-installment floor: PHP 3,000 (300000 minor). Below that the
 *   student must pay in full.
 * - Monthly split: floor division; the remainder goes on the first
 *   month so `firstMonth + monthly * (months - 1) === total` always.
 */

import { Result } from "@/domain/shared/Result";

/** Tenures the PayMongo hosted page can offer. */
export const INSTALLMENT_TERMS = [3, 6, 12] as const;

export type InstallmentTerm = (typeof INSTALLMENT_TERMS)[number];

/** PayMongo card-installment floor: PHP 3,000 in minor units. */
export const INSTALLMENT_MINIMUM_MINOR = 300_000;

export type InstallmentPlanError =
  | { kind: "invalid_term"; months: number }
  | { kind: "below_minimum"; totalMinor: number; minimumMinor: number };

export class InstallmentPlan {
  public readonly totalMinor: number;
  public readonly months: InstallmentTerm;
  /** Floor monthly amount for months 2..N. */
  public readonly monthlyMinor: number;
  /** First month absorbs the division remainder. */
  public readonly firstMonthMinor: number;

  private constructor(totalMinor: number, months: InstallmentTerm) {
    this.totalMinor = totalMinor;
    this.months = months;
    this.monthlyMinor = Math.floor(totalMinor / months);
    this.firstMonthMinor = totalMinor - this.monthlyMinor * (months - 1);
  }

  static create(params: {
    totalMinor: number;
    months: number;
  }): Result<InstallmentPlan, InstallmentPlanError> {
    if (!isTerm(params.months)) {
      return Result.err({ kind: "invalid_term", months: params.months });
    }
    if (!Number.isInteger(params.totalMinor) || params.totalMinor < INSTALLMENT_MINIMUM_MINOR) {
      return Result.err({
        kind: "below_minimum",
        totalMinor: params.totalMinor,
        minimumMinor: INSTALLMENT_MINIMUM_MINOR,
      });
    }
    return Result.ok(new InstallmentPlan(params.totalMinor, params.months));
  }

  /** Every monthly charge in order: first month first. */
  schedule(): readonly number[] {
    return Object.freeze([this.firstMonthMinor, ...Array(this.months - 1).fill(this.monthlyMinor)]);
  }
}

function isTerm(months: number): months is InstallmentTerm {
  return (INSTALLMENT_TERMS as readonly number[]).includes(months);
}
