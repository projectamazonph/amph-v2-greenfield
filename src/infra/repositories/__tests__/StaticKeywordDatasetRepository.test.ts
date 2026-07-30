import { describe, it, expect } from "vitest";
import {
  StaticKeywordDatasetRepository,
  STARTER_NICHE_IDS,
} from "../StaticKeywordDatasetRepository";

describe("StaticKeywordDatasetRepository", () => {
  const repo = new StaticKeywordDatasetRepository();

  it("exposes at least 4 starter niches across distinct categories", async () => {
    expect(STARTER_NICHE_IDS.length).toBeGreaterThanOrEqual(4);

    const categories = new Set<string>();
    for (const nicheId of STARTER_NICHE_IDS) {
      const result = await repo.findByNiche(nicheId);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      categories.add(result.value.categoryId);
    }
    expect(categories.size).toBeGreaterThanOrEqual(4);
  });

  it("returns the exact starter dataset for a curated niche", async () => {
    const result = await repo.findByNiche("bamboo-cutting-board");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.datasetId).toBe("kwds-bamboo-cutting-board");
    expect(result.value.nicheId).toBe("bamboo-cutting-board");
    expect(result.value.keywords.length).toBeGreaterThanOrEqual(15);
    expect(result.value.sourceType).toBe("synthetic_calibrated");
  });

  it("normalizes casing/whitespace before lookup", async () => {
    const result = await repo.findByNiche("  Bamboo Cutting Board  ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.datasetId).toBe("kwds-bamboo-cutting-board");
  });

  it("rejects a blank niche", async () => {
    const result = await repo.findByNiche("   ");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("invalid_niche");
  });

  it("no starter dataset contains a non-transferable local-intent term", async () => {
    for (const nicheId of STARTER_NICHE_IDS) {
      const result = await repo.findByNiche(nicheId);
      if (!result.ok) continue;
      for (const kw of result.value.keywords) {
        expect(kw.term.toLowerCase()).not.toContain("near me");
      }
    }
  });

  describe("synthetic fallback for uncurated niches", () => {
    it("generates a dataset for a niche with no starter data", async () => {
      const result = await repo.findByNiche("dog leash");
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.sourceType).toBe("synthetic_calibrated");
      expect(result.value.nicheId).toBe("dog-leash");
      expect(result.value.keywords.length).toBeGreaterThan(0);
      for (const kw of result.value.keywords) {
        expect(kw.term.toLowerCase()).not.toContain("near me");
      }
    });

    it("is deterministic: same niche produces identical rows every call", async () => {
      const first = await repo.findByNiche("standing desk mat");
      const second = await repo.findByNiche("standing desk mat");
      expect(first).toEqual(second);
    });

    it("normalizes distinct casings/spacing to the same fallback dataset", async () => {
      const a = await repo.findByNiche("Standing Desk Mat");
      const b = await repo.findByNiche("standing-desk-mat");
      expect(a).toEqual(b);
    });

    it("produces different rows for different niches", async () => {
      const a = await repo.findByNiche("dog leash");
      const b = await repo.findByNiche("cat leash");
      expect(a).not.toEqual(b);
    });

    it("guesses a category id from niche keywords", async () => {
      const beauty = await repo.findByNiche("hydrating face serum");
      expect(beauty.ok).toBe(true);
      if (beauty.ok) expect(beauty.value.categoryId).toBe("beauty");

      const electronics = await repo.findByNiche("usb charger cable");
      expect(electronics.ok).toBe(true);
      if (electronics.ok) expect(electronics.value.categoryId).toBe("electronics");

      const fallback = await repo.findByNiche("throw pillow");
      expect(fallback.ok).toBe(true);
      if (fallback.ok) expect(fallback.value.categoryId).toBe("general_home");
    });
  });
});
