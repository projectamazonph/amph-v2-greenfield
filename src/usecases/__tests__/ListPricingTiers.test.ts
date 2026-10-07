/**
 * Tests for ListPricingTiers.
 *
 * STORY-015. Uses InMemoryPricingTierRepository to test the use case
 * in isolation. Tests cover: happy path, sort order, empty catalog,
 * draft exclusion, DB error, and multi-tier enrichment.
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
  }> = {},
): PricingTier {
  const result = createPricingTier({
    id: overrides.id ?? "tier-id",
    slug: overrides.slug ?? "test-tier",
    name: overrides.name ?? "Test Tier",
    priceMinor: overrides.priceMinor ?? 299900,
    status: overrides.status ?? "ACTIVE",
    displayOrder: overrides.displayOrder ?? 0,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-01"),
  });
  if (!result.ok)
    throw new Error(`Test setup error: createPricingTier failed: ${result.error.kind}`);
  return result.value;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("ListPricingTiers", () => {
  it("includes the published course linked to a tier", async () => {
    const repo = new InMemoryPricingTierRepository();
    const tier = createPricingTier({
      id: "tier-foundations",
      slug: "foundations",
      name: "PPC Foundations",
      priceMinor: 299900,
      status: "ACTIVE",
    });
    if (!tier.ok) throw new Error("seed failed");
    repo.seed(tier.value);
    repo.seedCourseLink("tier-foundations", "ppc-foundations");

    const result = await new ListPricingTiers({ pricingTierRepo: repo }).execute();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.tiers[0]?.courseSlug).toBe("ppc-foundations");
  });

  let repo: InMemoryPricingTierRepository;
  let useCase: ListPricingTiers;

  beforeEach(() => {
    repo = new InMemoryPricingTierRepository();
    useCase = new ListPricingTiers({ pricingTierRepo: repo });
  });

  it("returns tiers", async () => {
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
  });

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

  it("returns db_error when repo.listActive throws", async () => {
    const stubRepo: IPricingTierRepository = {
      listAll: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      listActive: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      findById: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      findBySlug: async () => Result.err({ kind: "db_error", message: "Connection refused" }),
      findLinkedCourseSlug: async () =>
        Result.err({ kind: "db_error", message: "Connection refused" }),
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

  it("enriches multiple tiers independently", async () => {
    const tier1 = makeTier({
      id: "t1",
      slug: "foundations",
      name: "Foundations",
      priceMinor: 299900,
      displayOrder: 1,
    });
    const tier2 = makeTier({
      id: "t2",
      slug: "mastery",
      name: "Mastery",
      priceMinor: 599900,
      displayOrder: 2,
    });
    const tier3 = makeTier({
      id: "t3",
      slug: "ultimate",
      name: "Ultimate",
      priceMinor: 999900,
      displayOrder: 3,
    });

    repo.seedMany([tier1, tier2, tier3]);

    const result = await useCase.execute();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.tiers).toHaveLength(3);

    expect(result.value.tiers[0]!.displayPrice.minor).toBe(299900);
    expect(result.value.tiers[1]!.displayPrice.minor).toBe(599900);
    expect(result.value.tiers[2]!.displayPrice.minor).toBe(999900);
  });
});
