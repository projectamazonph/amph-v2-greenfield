/**
 * PricingTier — a first-class pricing bucket for the course catalog.
 *
 * STORY-011.
 *
 * Pricing is on the tier, not the course. The all-access pass points
 * to a special tier. A course is associated with a tier (FK added in
 * STORY-015), and an enrollment is associated with the tier the
 * student bought at the time of purchase.
 *
 * Lifecycle: DRAFT (admin only) -> ACTIVE (visible on /pricing) ->
 * ARCHIVED (hidden everywhere except admin list).
 *
 * ADR-013: this is a pure domain object. No imports from outer layers.
 */

import { Result } from "@/domain/shared/Result";
import { Money } from "@/domain/values/Money";

export type PricingTierStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

/** All known pricing tier statuses, ordered by lifecycle. */
export const PRICING_TIER_STATUSES: readonly PricingTierStatus[] = [
  "DRAFT",
  "ACTIVE",
  "ARCHIVED",
] as const;

export interface PricingTier {
  readonly id: string;
  /**
   * URL-safe identifier, e.g. "foundations", "mastery", "ultimate",
   * "all-access". Kebab-case, lowercase, no leading/trailing hyphen,
   * no consecutive hyphens. Unique across all tiers (including
   * archived).
   */
  readonly slug: string;
  readonly name: string;
  /**
   * Price in minor units (centavos). `Money.zero("PHP")` is valid
   * (free tier). Floats are not accepted; the factory takes `priceMinor`
   * and constructs the `Money` value.
   */
  readonly price: Money;
  readonly status: PricingTierStatus;
  readonly displayOrder: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type CreatePricingTierError =
  { kind: "invalid_slug" } | { kind: "invalid_name" } | { kind: "invalid_price" };

/**
 * Create a PricingTier domain object.
 *
 * Slug rules (kebab-case):
 * - Lowercase letters, numbers, and single hyphens only.
 * - Must start with an alphanumeric character.
 * - Cannot end with a hyphen.
 * - No consecutive hyphens.
 *
 * Name must be a non-empty trimmed string.
 * `priceMinor` must be a non-negative integer.
 */
export function createPricingTier(params: {
  id: string;
  slug: string;
  name: string;
  priceMinor: number;
  currency?: "PHP" | "USD";
  status?: PricingTierStatus;
  displayOrder?: number;
  createdAt?: Date;
  updatedAt?: Date;
}): Result<PricingTier, CreatePricingTierError> {
  // Fail Fast: slug validation
  if (!isValidSlug(params.slug)) {
    return Result.err({ kind: "invalid_slug" });
  }

  // Fail Fast: name must be non-empty after trim
  const trimmedName = params.name.trim();
  if (!trimmedName) {
    return Result.err({ kind: "invalid_name" });
  }

  // Fail Fast: price must be a non-negative integer
  if (!Number.isInteger(params.priceMinor) || params.priceMinor < 0) {
    return Result.err({ kind: "invalid_price" });
  }

  const now = params.updatedAt ?? params.createdAt ?? new Date();
  return Result.ok({
    id: params.id,
    slug: params.slug,
    name: trimmedName,
    price: Money.of(params.priceMinor, params.currency ?? "PHP"),
    status: params.status ?? "DRAFT",
    displayOrder: params.displayOrder ?? 0,
    createdAt: params.createdAt ?? new Date(),
    updatedAt: now,
  });
}

// ── Private helpers ─────────────────────────────────────────

const VALID_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isValidSlug(slug: string): boolean {
  return Boolean(slug) && VALID_SLUG.test(slug);
}

// ── Query helpers ────────────────────────────────────────────

/** Is this tier visible on the public pricing page? */
export function pricingTierIsActive(tier: PricingTier): boolean {
  return tier.status === "ACTIVE";
}

/** Is this tier hidden from all public surfaces? */
export function pricingTierIsArchived(tier: PricingTier): boolean {
  return tier.status === "ARCHIVED";
}

/** Sort key: `displayOrder` ascending, then `createdAt` ascending. */
export function comparePricingTiers(a: PricingTier, b: PricingTier): number {
  if (a.displayOrder !== b.displayOrder) {
    return a.displayOrder - b.displayOrder;
  }
  return a.createdAt.getTime() - b.createdAt.getTime();
}

// ── Update factory ───────────────────────────────────────────

/**
 * Patch type for `updatePricingTier`. Everything except `id`,
 * `createdAt` is mutable.
 */
export interface UpdatePricingTierPatch {
  slug?: string;
  name?: string;
  priceMinor?: number;
  currency?: "PHP" | "USD";
  status?: PricingTierStatus;
  displayOrder?: number;
}

/**
 * Apply a patch to an existing pricing tier. Returns a new
 * `PricingTier` with the patched fields, re-validating the result
 * (slug, name, price). Idempotent: an empty patch returns the same
 * tier (with a fresh `updatedAt`).
 */
export function updatePricingTier(
  tier: PricingTier,
  patch: UpdatePricingTierPatch,
  now: Date = new Date(),
): Result<PricingTier, CreatePricingTierError> {
  const merged = {
    id: tier.id,
    slug: patch.slug ?? tier.slug,
    name: patch.name ?? tier.name,
    priceMinor: patch.priceMinor ?? tier.price.minor,
    currency: patch.currency ?? tier.price.currency,
    status: patch.status ?? tier.status,
    displayOrder: patch.displayOrder ?? tier.displayOrder,
    createdAt: tier.createdAt,
    updatedAt: now,
  };

  return createPricingTier(merged);
}
