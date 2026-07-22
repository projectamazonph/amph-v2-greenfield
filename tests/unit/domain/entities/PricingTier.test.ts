/**
 * PricingTier entity tests — TDD (red first).
 *
 * STORY-011: PricingTier model + repository.
 *
 * Every factory branch and every guard must be exercised here.
 * Mirrors the structure of `tests/unit/domain/entities/DiscountCode.test.ts`.
 */

import { describe, it, expect } from "vitest";
import { Result } from "@/domain/shared/Result";
import {
  createPricingTier,
  updatePricingTier,
  pricingTierIsActive,
  pricingTierIsArchived,
  comparePricingTiers,
  type PricingTier,
} from "@/domain/entities/PricingTier";

const NOW = new Date("2026-07-01T00:00:00Z");

function makeTier(
  overrides: Partial<{
    id: string;
    slug: string;
    name: string;
    priceMinor: number;
    status: PricingTier["status"];
    displayOrder: number;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
): PricingTier {
  const result = createPricingTier({
    id: overrides.id ?? "pt_01",
    slug: overrides.slug ?? "foundations",
    name: overrides.name ?? "PPC Foundations",
    priceMinor: overrides.priceMinor ?? 299900,
    status: overrides.status,
    displayOrder: overrides.displayOrder,
    createdAt: overrides.createdAt ?? NOW,
    updatedAt: overrides.updatedAt ?? NOW,
  });
  if (!Result.isOk(result)) throw new Error(`test setup: ${result.error.kind}`);
  return result.value;
}

describe("PricingTier entity", () => {
  describe("createPricingTier", () => {
    it("creates a tier with all fields", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
        status: "ACTIVE",
        displayOrder: 0,
      });
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.id).toBe("pt_01");
      expect(result.value.slug).toBe("foundations");
      expect(result.value.name).toBe("PPC Foundations");
      expect(result.value.price.minor).toBe(299900);
      expect(result.value.price.currency).toBe("PHP");
      expect(result.value.status).toBe("ACTIVE"); // explicit
      expect(result.value.displayOrder).toBe(0);
      expect(result.value.createdAt).toBeInstanceOf(Date);
    });

    it("defaults status to DRAFT when not provided", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.status).toBe("DRAFT");
    });

    it("defaults displayOrder to 0 when not provided", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.displayOrder).toBe(0);
    });

    it("trims whitespace from the name", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "  PPC Foundations  ",
        priceMinor: 299900,
      });
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.name).toBe("PPC Foundations");
    });

    it("rejects an empty slug", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_slug");
    });

    it("rejects an uppercase slug", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "FOUNDATIONS",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_slug");
    });

    it("rejects a slug with leading hyphen", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "-foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
    });

    it("rejects a slug with trailing hyphen", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations-",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
    });

    it("rejects a slug with consecutive hyphens", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "ppc--foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
    });

    it("rejects a slug with non-kebab characters", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "ppc_foundations",
        name: "PPC Foundations",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
    });

    it("rejects an empty (whitespace-only) name", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "   ",
        priceMinor: 299900,
      });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_name");
    });

    it("rejects a negative price", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "PPC Foundations",
        priceMinor: -1,
      });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_price");
    });

    it("rejects a non-integer price", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "foundations",
        name: "PPC Foundations",
        priceMinor: 2999.5,
      });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_price");
    });

    it("accepts a free tier (priceMinor = 0)", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "free-preview",
        name: "Free Preview",
        priceMinor: 0,
      });
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.price.isZero()).toBe(true);
    });

    it("accepts a single-character slug segment", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "a",
        name: "Tier A",
        priceMinor: 0,
      });
      expect(Result.isOk(result)).toBe(true);
    });

    it("accepts a numeric slug", () => {
      const result = createPricingTier({
        id: "pt_01",
        slug: "tier-1",
        name: "Tier 1",
        priceMinor: 0,
      });
      expect(Result.isOk(result)).toBe(true);
    });
  });

  describe("pricingTierIsActive", () => {
    it("returns true only when status is ACTIVE", () => {
      expect(pricingTierIsActive(makeTier({ status: "ACTIVE" }))).toBe(true);
      expect(pricingTierIsActive(makeTier({ status: "DRAFT" }))).toBe(false);
      expect(pricingTierIsActive(makeTier({ status: "ARCHIVED" }))).toBe(false);
    });
  });

  describe("pricingTierIsArchived", () => {
    it("returns true only when status is ARCHIVED", () => {
      expect(pricingTierIsArchived(makeTier({ status: "ARCHIVED" }))).toBe(true);
      expect(pricingTierIsArchived(makeTier({ status: "ACTIVE" }))).toBe(false);
      expect(pricingTierIsArchived(makeTier({ status: "DRAFT" }))).toBe(false);
    });
  });

  describe("comparePricingTiers", () => {
    it("sorts by displayOrder ascending", () => {
      const a = makeTier({ id: "a", displayOrder: 1 });
      const b = makeTier({ id: "b", displayOrder: 0 });
      const sorted = [a, b].slice().sort(comparePricingTiers);
      expect(sorted[0]?.id).toBe("b");
      expect(sorted[1]?.id).toBe("a");
    });

    it("breaks ties by createdAt ascending", () => {
      const early = makeTier({ id: "early", displayOrder: 0, createdAt: new Date("2026-01-01") });
      const late = makeTier({ id: "late", displayOrder: 0, createdAt: new Date("2026-07-01") });
      const sorted = [late, early].slice().sort(comparePricingTiers);
      expect(sorted[0]?.id).toBe("early");
      expect(sorted[1]?.id).toBe("late");
    });
  });

  describe("updatePricingTier", () => {
    it("applies a partial patch and re-validates", () => {
      const original = makeTier({ slug: "foundations", name: "Foundations", priceMinor: 299900 });
      const result = updatePricingTier(
        original,
        { name: "PPC Foundations v2", priceMinor: 399900 },
        new Date("2026-08-01"),
      );
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.name).toBe("PPC Foundations v2");
      expect(result.value.price.minor).toBe(399900);
      expect(result.value.slug).toBe("foundations"); // unchanged
      expect(result.value.updatedAt).toEqual(new Date("2026-08-01"));
    });

    it("rejects an invalid slug via the re-validation", () => {
      const original = makeTier();
      const result = updatePricingTier(original, { slug: "BAD SLUG" });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_slug");
    });

    it("rejects a negative price via the re-validation", () => {
      const original = makeTier();
      const result = updatePricingTier(original, { priceMinor: -1 });
      expect(Result.isErr(result)).toBe(true);
      if (Result.isOk(result)) return;
      expect(result.error.kind).toBe("invalid_price");
    });

    it("accepts an empty patch (idempotent) and refreshes updatedAt", () => {
      const original = makeTier();
      const result = updatePricingTier(original, {}, new Date("2026-09-01"));
      if (!Result.isOk(result)) throw new Error("expected ok");
      expect(result.value.id).toBe(original.id);
      expect(result.value.slug).toBe(original.slug);
      expect(result.value.name).toBe(original.name);
      expect(result.value.price.minor).toBe(original.price.minor);
      expect(result.value.updatedAt).toEqual(new Date("2026-09-01"));
    });
  });
});
