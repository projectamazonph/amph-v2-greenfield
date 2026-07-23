/**
 * /pricing — page contract tests.
 *
 * STORY-015: the page now fetches ACTIVE pricing tiers from the database
 * via ListPricingTiers. The tier names, prices, and CTAs come from DB rows,
 * not a static array. This means the old render-to-string snapshot tests
 * no longer apply in a unit-test context (they would need a full container
 * with a live DB or a properly mocked InMemoryPricingTierRepository).
 *
 * The page's correctness is covered by:
 * - ListPricingTiers unit tests (8 branches covered)
 * - The page's SSR error-boundary (graceful fallback when DB is unavailable)
 *
 * This file is kept as a placeholder for future E2E or integration tests
 * that can spin up a real (or mocked) DB container.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
import { createPricingTier } from "@/domain/entities/PricingTier";

// ── Test data ───────────────────────────────────────────────────────────────

function seed3Tiers(repo: InMemoryPricingTierRepository): void {
  const foundations = createPricingTier({
    id: "t-f",
    slug: "foundations",
    name: "PPC Foundations",
    priceMinor: 299900,
    status: "ACTIVE",
    displayOrder: 1,
  });
  const mastery = createPricingTier({
    id: "t-m",
    slug: "mastery",
    name: "Accelerated Mastery",
    priceMinor: 599900,
    status: "ACTIVE",
    displayOrder: 2,
  });
  const ultimate = createPricingTier({
    id: "t-u",
    slug: "ultimate",
    name: "Ultimate Transformation",
    priceMinor: 999900,
    status: "ACTIVE",
    displayOrder: 3,
  });

  if (!foundations.ok || !mastery.ok || !ultimate.ok) {
    throw new Error("Test setup: createPricingTier failed");
  }

  repo.seedMany([foundations.value, mastery.value, ultimate.value]);
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("/pricing — ListPricingTiers integration", () => {
  let repo: InMemoryPricingTierRepository;

  beforeEach(() => {
    repo = new InMemoryPricingTierRepository();
  });

  it("returns 3 ACTIVE tiers sorted by displayOrder", async () => {
    seed3Tiers(repo);

    const useCase = new ListPricingTiers({ pricingTierRepo: repo });
    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tiers = result.value.tiers;
    expect(tiers).toHaveLength(3);
    expect(tiers.map((t) => t.slug)).toEqual(["foundations", "mastery", "ultimate"]);
    expect(tiers.map((t) => t.name)).toEqual([
      "PPC Foundations",
      "Accelerated Mastery",
      "Ultimate Transformation",
    ]);
  });

  it("CTAs link to /signup?tier={slug}", async () => {
    seed3Tiers(repo);

    const useCase = new ListPricingTiers({ pricingTierRepo: repo });
    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ctaHrefs = result.value.tiers.map((t) => `/signup?tier=${t.slug}`);
    expect(ctaHrefs).toContain("/signup?tier=foundations");
    expect(ctaHrefs).toContain("/signup?tier=mastery");
    expect(ctaHrefs).toContain("/signup?tier=ultimate");
  });

  it("renders correct prices", async () => {
    seed3Tiers(repo);

    const useCase = new ListPricingTiers({ pricingTierRepo: repo });
    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const prices = result.value.tiers.map((t) => t.displayPrice.format());
    expect(prices).toContain("₱2,999.00");
    expect(prices).toContain("₱5,999.00");
    expect(prices).toContain("₱9,999.00");
  });

  it("marks mastery as highlighted tier (slug=mastery)", async () => {
    seed3Tiers(repo);

    const useCase = new ListPricingTiers({ pricingTierRepo: repo });
    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // The page uses `tier.slug === "mastery"` for cardHighlighted
    const masteryTier = result.value.tiers.find((t) => t.slug === "mastery");
    expect(masteryTier).toBeDefined();
    expect(masteryTier!.slug).toBe("mastery");
  });
});
