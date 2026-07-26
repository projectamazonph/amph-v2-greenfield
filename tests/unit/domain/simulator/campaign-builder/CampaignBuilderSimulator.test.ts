/**
 * CampaignBuilderSimulator tests.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * Test groups:
 *  1. Edge cases (zero budget)
 *  2. Ground truth (no userAdjustedCampaigns) → scoreDimensions=null, score from formula
 *  3. Structure quality scoring
 *  4. Budget allocation scoring
 *  5. Keyword relevance scoring
 *  6. Explanation = 100
 *  7. Overall score = structureQuality when grading
 *  8. Backward compatibility
 */

import { describe, it, expect } from "vitest";
import { CampaignBuilderSimulator } from "@/domain/simulator/campaign-builder/CampaignBuilderSimulator";
import type { CampaignBuilderInput } from "@/domain/simulator/campaign-builder/CampaignBuilderInput";
import type { CampaignStructure } from "@/domain/simulator/campaign-builder/CampaignBuilderOutput";

const simulator = new CampaignBuilderSimulator();

const BASE_INPUT: CampaignBuilderInput = {
  productCategory: "Electronics",
  productNiche: "wireless earbuds",
  monthlyBudget: 3000,
  targetingStrategy: "hybrid",
};

// ── Edge cases ────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("returns empty campaigns and score 0 when monthlyBudget is zero", async () => {
    const input: CampaignBuilderInput = {
      ...BASE_INPUT,
      monthlyBudget: 0,
    };
    const result = await simulator.run(input);
    expect(result.campaigns).toHaveLength(0);
    expect(result.score).toBe(0);
    expect(result.scoreDimensions).toBeNull();
  });
});

// ── Ground truth (no userAdjustedCampaigns) ─────────────────────────────

describe("ground truth (no userAdjustedCampaigns)", () => {
  it("returns campaigns with scoreDimensions null and score from structural completeness formula", async () => {
    const result = await simulator.run(BASE_INPUT);
    expect(result.campaigns.length).toBeGreaterThan(0);
    expect(result.scoreDimensions).toBeNull();
    // hybrid → base 50 + 25 (hybrid) + 15 (brands) = 90
    expect(result.score).toBe(90);
  });

  it("generates SP Manual campaign for hybrid targeting", async () => {
    const result = await simulator.run(BASE_INPUT);
    const spManual = result.campaigns.find((c) => c.name.includes("Manual"));
    expect(spManual).toBeDefined();
    expect(spManual!.type).toBe("sponsored-products");
  });

  it("generates SP Auto campaign always", async () => {
    const result = await simulator.run(BASE_INPUT);
    const spAuto = result.campaigns.find((c) => c.name.includes("Auto"));
    expect(spAuto).toBeDefined();
  });

  it("generates SB campaign when budget >= 500", async () => {
    const result = await simulator.run(BASE_INPUT); // 3000 >= 500
    const sb = result.campaigns.find((c) => c.name.includes("SB"));
    expect(sb).toBeDefined();
  });

  it("does not generate SB campaign when budget < 500", async () => {
    const input: CampaignBuilderInput = { ...BASE_INPUT, monthlyBudget: 400 };
    const result = await simulator.run(input);
    const sb = result.campaigns.find((c) => c.name.includes("SB"));
    expect(sb).toBeUndefined();
  });

  it("does not generate SP Manual campaign for auto targeting", async () => {
    const input: CampaignBuilderInput = { ...BASE_INPUT, targetingStrategy: "auto" };
    const result = await simulator.run(input);
    const spManual = result.campaigns.find((c) => c.name.includes("Manual"));
    expect(spManual).toBeUndefined();
  });
});

// ── Dimension scoring ────────────────────────────────────────────────────

describe("dimension scoring (userAdjustedCampaigns provided)", () => {
  it("scoreDimensions is not null when userAdjustedCampaigns provided", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [],
    });
    expect(result.scoreDimensions).not.toBeNull();
  });

  it("structureQuality = 100 when user covers all ground truth campaign types", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.structureQuality).toBe(100);
  });

  it("structureQuality = 0 when user provides no campaigns", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [],
    });
    expect(result.scoreDimensions!.structureQuality).toBe(0);
  });

  it("structureQuality scales proportionally when user misses some campaign types", async () => {
    // Only provides SP Auto (1 of 3 expected)
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.structureQuality).toBe(33); // 1/3
  });

  it("budgetAllocation = 100 when user's budgets are within 50% of ground truth", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.budgetAllocation).toBe(100);
  });

  it("budgetAllocation scales when user over/under-allocates", async () => {
    // All budgets way off from ground truth
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱1/d",
          type: "sponsored-products",
          dailyBudget: 1,
          adGroups: [],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱1/d",
          type: "sponsored-products",
          dailyBudget: 1,
          adGroups: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱1/d",
          type: "sponsored-brands",
          dailyBudget: 1,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.budgetAllocation).toBe(0);
  });

  it("keywordRelevance = 100 when all keywords contain niche words", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Brand",
              keywords: [
                { keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
                { keyword: "best wireless earbuds", matchType: "phrase", suggestedBid: 0.32 },
              ],
              suggestedBid: 0.36,
            },
          ],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.keywordRelevance).toBe(100);
  });

  it("keywordRelevance = 0 when no keywords contain niche words", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Brand",
              keywords: [
                { keyword: "foo bar baz", matchType: "exact", suggestedBid: 0.4 },
                { keyword: "xyz abc", matchType: "phrase", suggestedBid: 0.32 },
              ],
              suggestedBid: 0.36,
            },
          ],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.keywordRelevance).toBe(0);
  });
});

// ── Overall score ────────────────────────────────────────────────────────

describe("overall score", () => {
  it("score equals structureQuality when grading (userAdjustedCampaigns provided)", async () => {
    // Only 1 of 3 expected campaign types → structureQuality = 33
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
        },
      ],
    });
    expect(result.score).toBe(result.scoreDimensions!.structureQuality);
  });

  it("score from structural completeness formula when preview mode", async () => {
    const result = await simulator.run(BASE_INPUT);
    expect(result.scoreDimensions).toBeNull();
    expect(result.score).toBe(90); // hybrid → 50 + 25 + 15
  });
});

// ── Backward compatibility ───────────────────────────────────────────────

describe("backward compatibility", () => {
  it("run without userAdjustedCampaigns produces the same campaign shape as before", async () => {
    const result = await simulator.run({
      productCategory: "Running Shoes",
      monthlyBudget: 1000,
      targetingStrategy: "manual",
      productNiche: "running shoes",
    });
    expect(result.campaigns.length).toBeGreaterThan(0);
    expect(result.scoreDimensions).toBeNull();
    for (const c of result.campaigns) {
      expect(c.name).toBeTruthy();
      expect(["sponsored-products", "sponsored-brands"]).toContain(c.type);
      expect(c.dailyBudget).toBeGreaterThan(0);
    }
  });
});
