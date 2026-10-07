/**
 * ListPricingTiers — public pricing page (STORY-015).
 *
 * Fetches all ACTIVE pricing tiers. Decision 6 (2026-09-24): each
 * tier has exactly one price now (early-bird is dropped), so the
 * public tier shape is the same as the entity minus the early-bird
 * surface. The /pricing page renders the regular price on every
 * active tier card.
 */

import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";
import type { PricingTierRepositoryError } from "@/ports/repositories/IPricingTierRepository";
import { Result } from "@/domain/shared/Result";
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
  /** The price shown to the user. */
  readonly displayPrice: Money;
  readonly currency: string;
  readonly status: string;
  readonly displayOrder: number;
  readonly courseSlug: string | null;
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

    const linkResults = await Promise.all(
      result.value.map((tier) => this._repo.findLinkedCourseSlug(tier.id)),
    );

    const publicTiers: PublicPricingTier[] = [];
    for (let index = 0; index < result.value.length; index++) {
      const tier = result.value[index]!;
      const linkResult = linkResults[index]!;
      if (!linkResult.ok) {
        return Result.err({ kind: "db_error", message: tierErrorMsg(linkResult.error) });
      }
      publicTiers.push({
        id: tier.id,
        slug: tier.slug,
        name: tier.name,
        displayPrice: tier.price,
        currency: tier.price.currency,
        status: tier.status,
        displayOrder: tier.displayOrder,
        courseSlug: linkResult.value,
      });
    }

    publicTiers.sort((a, b) => a.displayOrder - b.displayOrder);

    return Result.ok({ tiers: publicTiers });
  }

  private readonly _repo: IPricingTierRepository;
}
