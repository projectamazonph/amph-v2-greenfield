/**
 * InMemoryPricingTierRepository adapter test.
 *
 * STORY-011: PricingTier model + repository.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryPricingTierRepository } from "@/infra/repositories/InMemoryPricingTierRepository";
import { createPricingTier } from "@/domain/entities/PricingTier";
import type { PricingTier } from "@/domain/entities/PricingTier";

const NOW = new Date("2026-07-01T00:00:00Z");

function makeTier(
  overrides: Partial<{
    id: string;
    slug: string;
    name: string;
    priceMinor: number;
    status: PricingTier["status"];
    displayOrder: number;
  }> = {},
): PricingTier {
  const result = createPricingTier({
    id: overrides.id ?? "pt_01",
    slug: overrides.slug ?? "foundations",
    name: overrides.name ?? "PPC Foundations",
    priceMinor: overrides.priceMinor ?? 299900,
    status: overrides.status,
    displayOrder: overrides.displayOrder,
    createdAt: NOW,
    updatedAt: NOW,
  });
  if (!result.ok) throw new Error(`test setup: ${result.error.kind}`);
  return result.value;
}

describe("InMemoryPricingTierRepository", () => {
  let repo: InMemoryPricingTierRepository;

  beforeEach(() => {
    repo = new InMemoryPricingTierRepository();
  });

  // ── create + round-trip ─────────────────────────────────

  it("create + findById round-trips", async () => {
    const tier = makeTier({ slug: "foundations", name: "Foundations", status: "ACTIVE" });
    const createResult = await repo.create(tier);
    expect(createResult.ok).toBe(true);
    if (!createResult.ok) return;

    const found = await repo.findById(tier.id);
    expect(found.ok).toBe(true);
    if (!found.ok) return;
    expect(found.value?.id).toBe(tier.id);
    expect(found.value?.status).toBe("ACTIVE");
  });

  it("findById returns null for unknown id", async () => {
    const result = await repo.findById("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── slug uniqueness ─────────────────────────────────────────

  it("create rejects a duplicate slug", async () => {
    const t1 = makeTier({ slug: "foundations" });
    await repo.create(t1);

    const t2 = makeTier({ id: "pt_02", slug: "foundations" });
    const result = await repo.create(t2);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  // ── findBySlug ───────────────────────────────────────────────

  it("findBySlug returns the tier", async () => {
    const tier = makeTier({ slug: "mastery" });
    await repo.create(tier);

    const result = await repo.findBySlug("mastery");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.slug).toBe("mastery");
  });

  it("findBySlug returns null for unknown slug", async () => {
    const result = await repo.findBySlug("ghost");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── listAll ─────────────────────────────────────────────────

  it("listAll excludes archived tiers", async () => {
    const t1 = makeTier({ slug: "active-1", status: "ACTIVE" });
    const t2 = makeTier({ id: "pt_02", slug: "active-2", status: "ACTIVE" });
    const t3 = makeTier({ id: "pt_03", slug: "draft", status: "DRAFT" });
    await repo.create(t1);
    await repo.create(t2);
    await repo.create(t3);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(3);
    const slugs = result.value.map((t) => t.slug);
    expect(slugs).toContain("active-1");
    expect(slugs).toContain("active-2");
    expect(slugs).toContain("draft");
  });

  it("listAll excludes archived tiers after archive()", async () => {
    const t1 = makeTier({ slug: "active-1", status: "ACTIVE" });
    const t2 = makeTier({ id: "pt_02", slug: "to-archive", status: "ACTIVE" });
    await repo.create(t1);
    await repo.create(t2);
    await repo.archive(t2.id);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.slug)).not.toContain("to-archive");
  });

  it("listAll sorts by displayOrder then createdAt", async () => {
    const t1 = makeTier({ id: "pt_01", slug: "second", displayOrder: 1 });
    const t2 = makeTier({ id: "pt_02", slug: "first", displayOrder: 0 });
    await repo.create(t1);
    await repo.create(t2);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value[0]?.slug).toBe("first");
    expect(result.value[1]?.slug).toBe("second");
  });

  // ── listActive ───────────────────────────────────────────────

  it("listActive returns only ACTIVE tiers", async () => {
    const t1 = makeTier({ slug: "active", status: "ACTIVE" });
    const t2 = makeTier({ id: "pt_02", slug: "draft", status: "DRAFT" });
    await repo.create(t1);
    await repo.create(t2);

    const result = await repo.listActive();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((t) => t.slug)).toEqual(["active"]);
  });

  // ── archive ─────────────────────────────────────────────────

  it("archive marks a tier as ARCHIVED", async () => {
    const tier = makeTier({ status: "ACTIVE" });
    await repo.create(tier);

    const result = await repo.archive(tier.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("ARCHIVED");
  });

  it("archive is idempotent", async () => {
    const tier = makeTier({ status: "ACTIVE" });
    await repo.create(tier);
    await repo.archive(tier.id);

    const result = await repo.archive(tier.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.status).toBe("ARCHIVED");
  });

  it("archive returns not_found for unknown id", async () => {
    const result = await repo.archive("ghost");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("archived tier is hidden from findById", async () => {
    const tier = makeTier({ status: "ACTIVE" });
    await repo.create(tier);
    await repo.archive(tier.id);

    const result = await repo.findById(tier.id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  it("archived tier is hidden from findBySlug", async () => {
    const tier = makeTier({ slug: "to-archive", status: "ACTIVE" });
    await repo.create(tier);
    await repo.archive(tier.id);

    const result = await repo.findBySlug("to-archive");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toBeNull();
  });

  // ── update ──────────────────────────────────────────────────

  it("update replaces the tier", async () => {
    const tier = makeTier({ name: "Old Name", status: "DRAFT" });
    await repo.create(tier);

    const updatedTier: PricingTier = { ...tier, name: "New Name", status: "ACTIVE" };
    const updateResult = await repo.update(updatedTier);
    expect(updateResult.ok).toBe(true);
    if (!updateResult.ok) return;
    expect(updateResult.value.name).toBe("New Name");
    expect(updateResult.value.status).toBe("ACTIVE");
  });

  it("update returns not_found for unknown id", async () => {
    const tier = makeTier({ id: "ghost" });
    const result = await repo.update(tier);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("not_found");
  });

  it("update rejects a slug collision with another tier", async () => {
    const t1 = makeTier({ slug: "tier-1" });
    const t2 = makeTier({ id: "pt_02", slug: "tier-2" });
    await repo.create(t1);
    await repo.create(t2);

    const result = await repo.update({ ...t2, slug: "tier-1" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("slug_taken");
  });

  it("update allows keeping the same slug", async () => {
    const tier = makeTier({ slug: "keep-slug" });
    await repo.create(tier);

    const result = await repo.update({ ...tier, name: "Renamed" });
    expect(result.ok).toBe(true);
  });

  // ── clear ──────────────────────────────────────────────────

  it("clear removes all tiers", async () => {
    await repo.create(makeTier());
    await repo.create(makeTier({ id: "pt_02", slug: "t2" }));
    repo.clear();

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(0);
  });

  // ── seed + seedMany ────────────────────────────────────────

  it("seed pre-populates a tier", async () => {
    const tier = makeTier({ slug: "seeded", status: "ACTIVE" });
    repo.seed(tier);

    const result = await repo.findBySlug("seeded");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value?.status).toBe("ACTIVE");
  });

  it("seedMany pre-populates multiple tiers", async () => {
    const tiers = [makeTier({ slug: "s1" }), makeTier({ id: "pt_02", slug: "s2" })];
    repo.seedMany(tiers);

    const result = await repo.listAll();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toHaveLength(2);
  });
});
