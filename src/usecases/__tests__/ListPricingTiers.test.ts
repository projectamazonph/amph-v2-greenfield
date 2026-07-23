/**
 * Tests for ListPricingTiers.
 *
 * STORY-015. Uses InMemoryPricingTierRepository to test the use case
 * in isolation. Tests cover: happy path (no early-bird), early-bird
 * active, early-bird expired, empty catalog, DB error, sort order.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ListPricingTiers } from "@/usecases/ListPricingTiers";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { createPricingTier } from "@/domain/entities/PricingTier";
import type { PricingTier } from "@/domain/entities/PricingTier";
import type { IPricingTierRepository } from "@/ports/repositories/IPricingTierRepository";
import { Result } from "@/domain/shared/Result";

// ── Test data factory ───────────────────────────────────────────────────────

function makeTier(
  overrides: Partial<{
    id: string;
    slug: string;
    name: string;
    priceMinor: number;
    status: "DRAFT" | "ACTIVE" | "ARCHIVED";
    displayOrder: number;
    earlyBirdPriceMinor: number;
    earlyBirdEndsAt: Date;
  }> = {},
): PricingTier {
  const result = createPricingTier({
    id: overrides.id ?? "tier-id",
    slug: overrides.slug ?? "test-tier",
    name: overrides.name ?? "Test Tier",
    priceMinor: overrides.priceMinor ?? 299900,
    status: overrides.status ?? "ACTIVE",
    displayOrder: overrides.displayOrder ?? 0,
    earlyBirdPriceMinor: overrides.earlyBirdPriceMinor,
    earlyBirdEndsAt: overrides.earlyBirdEndsAt,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  });
  if (!result.ok)
    throw new Error(`Test setup error: createPricingTier failed: ${result.error.kind}`);
  return result.value;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ListPricingTiers", () => {
  let repo: InMemoryPricingTierRepository;
  let useCase: ListPricingTiers;

  beforeEach(() => {
    repo = new InMemoryPricingTierRepository();
    useCase = new ListPricingTiers({ pricingTierRepo: repo });
  });

  // ── Happy path: no early-bird ──────────────────────────────────────────────

  it("returns tiers with no early-bird pricing", async () => {
    const tier = makeTier({
      id: "tier-1",
      slug: "foundations",
      name: "PPC Foundations",
      priceMinor: 299900,
      displayOrder: 1,
    });
    repo.seed(tier);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(1);
    expect(result.value.tiers[0]!.id).toBe("tier-1");
    expect(result.value.tiers[0]!.slug).toBe("foundations");
    expect(result.value.tiers[0]!.isEarlyBird).toBe(false);
    expect(result.value.tiers[0]!.originalPrice).toBeNull();
    expect(result.value.tiers[0]!.earlyBirdMinutesRemaining).toBe(0);
  });

  // ── Early-bird window ──────────────────────────────────────────────────────

  it("shows early-bird price and countdown when window is open", async () => {
    // Use a future date relative to when the test actually runs so
    // ListPricingTiers.execute()'s internal `now` is always before endsAt.
    const endsAt = new Date(Date.now() + 90 * 60_000);

    const tier = makeTier({
      id: "tier-2",
      slug: "mastery",
      name: "Accelerated Mastery",
      priceMinor: 599900,
      earlyBirdPriceMinor: 499900,
      earlyBirdEndsAt: endsAt,
      displayOrder: 2,
    });
    repo.seed(tier);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(1);

    const t = result.value.tiers[0]!;
    expect(t.isEarlyBird).toBe(true);
    expect(t.earlyBirdMinutesRemaining).toBe(90);
    // displayPrice is the early-bird price
    expect(t.displayPrice.minor).toBe(499900);
    // originalPrice is the regular price
    expect(t.originalPrice!.minor).toBe(599900);
  });

  it("returns regular price when early-bird has expired", async () => {
    // earlyBirdEndsAt is 30 minutes in the past relative to test run time
    const endsAt = new Date(Date.now() - 30 * 60_000);

    const tier = makeTier({
      id: "tier-3",
      slug: "ultimate",
      name: "Ultimate Transformation",
      priceMinor: 999900,
      earlyBirdPriceMinor: 799900,
      earlyBirdEndsAt: endsAt,
      displayOrder: 3,
    });
    repo.seed(tier);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const t = result.value.tiers[0]!;
    expect(t.isEarlyBird).toBe(false);
    expect(t.earlyBirdMinutesRemaining).toBe(0);
    expect(t.displayPrice.minor).toBe(999900);
    expect(t.originalPrice).toBeNull();
  });

  // ── Sort order ─────────────────────────────────────────────────────────────

  it("sorts tiers by displayOrder ascending", async () => {
    const tier3 = makeTier({ id: "t3", slug: "c", name: "C", displayOrder: 3 });
    const tier1 = makeTier({ id: "t1", slug: "a", name: "A", displayOrder: 1 });
    const tier2 = makeTier({ id: "t2", slug: "b", name: "B", displayOrder: 2 });
    repo.seedMany([tier3, tier1, tier2]);

    const result = await useCase.execute();

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers.map((t) => t.displayOrder)).toEqual([1, 2, 3]);
  });

  // ── Empty catalog ───────────────────────────────────────────────────────────

  it("returns empty list when no active tiers exist", async () => {
    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(0);
  });

  it("excludes DRAFT tiers", async () => {
    const draft = makeTier({
      id: "draft",
      slug: "draft-slug",
      name: "Draft Tier",
      status: "DRAFT",
    });
    const active = makeTier({
      id: "active",
      slug: "active-slug",
      name: "Active Tier",
      status: "ACTIVE",
    });
    repo.seedMany([draft, active]);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(1);
    expect(result.value.tiers[0]!.id).toBe("active");
  });

  // ── Error propagation ──────────────────────────────────────────────────────

  it("returns db_error when repo.listActive throws", async () => {
    // Swap in a stub that always errors
    const stubRepo: IPricingTierRepository = {
      listAll: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      listActive: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      findById: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      findBySlug: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      create: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      update: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      archive: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
    };

    const stubUseCase = new ListPricingTiers({ pricingTierRepo: stubRepo });
    const result = await stubUseCase.execute();

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
    expect(result.error.message).toBe("Connection refused");
  });

  // ── Multiple tiers ────────────────────────────────────────────────────────

  it("enriches multiple tiers independently", async () => {
    const now = new Date(); // test run time
    const endsSoon = new Date(now.getTime() + 60 * 60_000); // 1 hour from now

    const noEarlyBird = makeTier({
      id: "no-eb",
      slug: "foundations",
      name: "Foundations",
      priceMinor: 299900,
      displayOrder: 1,
    });
    const withEarlyBird = makeTier({
      id: "with-eb",
      slug: "mastery",
      name: "Mastery",
      priceMinor: 599900,
      earlyBirdPriceMinor: 499900,
      earlyBirdEndsAt: endsSoon,
      displayOrder: 2,
    });
    const expired = makeTier({
      id: "expired",
      slug: "ultimate",
      name: "Ultimate",
      priceMinor: 999900,
      earlyBirdPriceMinor: 899900,
      earlyBirdEndsAt: new Date(now.getTime() - 5 * 60_000), // expired 5 min ago
      displayOrder: 3,
    });

    repo.seedMany([withEarlyBird, expired, noEarlyBird]);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(3);

    const foundations = result.value.tiers[0]!;
    const mastery = result.value.tiers[1]!;
    const ultimate = result.value.tiers[2]!;

    expect(foundations.isEarlyBird).toBe(false);
    expect(foundations.originalPrice).toBeNull();

    expect(mastery.isEarlyBird).toBe(true);
    expect(mastery.earlyBirdMinutesRemaining).toBe(60);
    expect(mastery.displayPrice.minor).toBe(499900);

    expect(ultimate.isEarlyBird).toBe(false);
    expect(ultimate.earlyBirdMinutesRemaining).toBe(0);
    expect(ultimate.displayPrice.minor).toBe(999900);
  });
});
