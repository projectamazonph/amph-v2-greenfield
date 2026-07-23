/**
 * ListPricingTiers — public pricing page (STORY-015).
 *
 * Fetches all ACTIVE pricing tiers, enriched with:
 * - The effective (display) price: early-bird if window is open,
 *   otherwise the regular price.
 * - Whether the early-bird window is currently active.
 * - Minutes remaining in the early-bird window.
 *
 * The /pricing page uses this to render tier cards with countdown timers
 * and the correct price based on the time window.
 *
 * STORY-015.
 */

import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";
import type { PricingTierRepositoryError } from "@/ports/repositories/IPricingTierRepository";
import { Result } from "@/domain/shared/Result";
import {
  effectivePrice,
  earlyBirdIsActive,
  earlyBirdMinutesRemaining,
} from "@/domain/entities/PricingTier";
import type { Money } from "@/domain/values/Money";

// ── Error helper ───────────────────────────────────────────────────────────────

function tierErrorMsg(e: PricingTierRepositoryError): string {
  if ("message" in e && typeof e.message === "string") return e.message;
  return e.kind;
}

// ── Types ─────────────────────────────────────────────────────────────────────

/** A tier as shown on the public /pricing page. */
export interface PublicPricingTier {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  /** The price shown to the user: early-bird if window is open, otherwise regular. */
  readonly displayPrice: Money;
  /** The original (non-discounted) price — only set when early-bird is active. */
  readonly originalPrice: Money | null;
  readonly currency: string;
  readonly status: string;
  readonly displayOrder: number;
  readonly isEarlyBird: boolean;
  readonly earlyBirdMinutesRemaining: number;
}

export type ListPricingTiersError = { kind: "db_error"; message: string };

export interface ListPricingTiersResult {
  readonly tiers: readonly PublicPricingTier[];
}

// ── Use case ─────────────────────────────────────────────────────────────────

export class ListPricingTiers {
  constructor(options: { pricingTierRepo: IPricingTierRepository }) {
    this._repo = options.pricingTierRepo;
  }

  async execute(): Promise<Result<ListPricingTiersResult, ListPricingTiersError>> {
    const result = await this._repo.listActive();
    if (!result.ok) {
      return Result.err({
        kind: "db_error",
        message: tierErrorMsg(result.error as PricingTierRepositoryError),
      });
    }

    const now = new Date();
    const publicTiers: PublicPricingTier[] = [];

    for (const tier of result.value) {
      const isEarlyBird = earlyBirdIsActive(tier, now);
      const displayPrice = effectivePrice(tier, now);

      publicTiers.push({
        id: tier.id,
        slug: tier.slug,
        name: tier.name,
        displayPrice,
        originalPrice: isEarlyBird ? tier.price : null,
        currency: tier.price.currency,
        status: tier.status,
        displayOrder: tier.displayOrder,
        isEarlyBird,
        earlyBirdMinutesRemaining: isEarlyBird ? earlyBirdMinutesRemaining(tier, now) : 0,
      });
    }

    // Sort by displayOrder (matches comparePricingTiers order)
    publicTiers.sort((a, b) => a.displayOrder - b.displayOrder);

    return Result.ok({ tiers: publicTiers });
  }

  private readonly _repo: IPricingTierRepository;
}
