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

  it("structureQuality = 50 when user provides no campaigns (0% type coverage, 100% match-type purity by default)", async () => {
    // STORY-084: structureQuality = round((campaignTypeCoverage + matchTypePurity) / 2).
    // With no campaigns there's nothing to violate on match-type purity
    // (default 100), so the floor isn't 0 -- it's half of the coverage gap.
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [],
    });
    expect(result.scoreDimensions!.structureQuality).toBe(50);
  });

  it("structureQuality scales with campaign-type coverage, averaged with match-type purity", async () => {
    // Only provides SP Auto (1 of 3 expected types, no ad groups so purity
    // defaults to 100): round((33 + 100) / 2) = 67.
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
    expect(result.scoreDimensions!.structureQuality).toBe(67);
  });

  it("structureQuality drops when an ad group mixes match types", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
                { keyword: "best wireless earbuds", matchType: "phrase", suggestedBid: 0.32 },
              ],
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
    // Full campaign-type coverage (100%) but the one checked ad group mixes
    // match types (purity 0%): round((100 + 0) / 2) = 50.
    expect(result.scoreDimensions!.structureQuality).toBe(50);
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
    // STORY-084: budgetAllocation = round(0.4*totalReconciliation + 0.6*perRoleAllocation).
    // All budgets (₱1/d each, ₱3/d total) are wildly under the ₱100/d
    // target, so total reconciliation fails its hard +-2% gate (0). Equal
    // 1/3 shares happen to land the "auto" role (25% target) within +-10pp
    // by coincidence, so perRoleAllocation = round(1/3 * 100) = 33:
    // round(0.4*0 + 0.6*33) = 20.
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
    expect(result.scoreDimensions!.budgetAllocation).toBe(20);
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

// ── STORY-084 Stage 1: negativeRouting ──────────────────────────────────────
// Agent-constructed synthetic examples (not Ryan-reviewed), per the user's
// explicit choice for this story's test data.

describe("negativeRouting scoring (STORY-084)", () => {
  it("negativeRouting = 100 when the user submits exactly the expected negative set", async () => {
    const preview = await simulator.run(BASE_INPUT);
    const userAdjustedCampaigns = preview.campaigns.map((c) => ({
      name: c.name,
      type: c.type,
      dailyBudget: c.dailyBudget,
      adGroups: c.adGroups,
      negativeKeywords: c.negativeKeywords,
    }));
    const result = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns });
    expect(result.scoreDimensions!.negativeRouting).toBe(100);
  });

  it("negativeRouting = 100 when no negatives are expected (auto-only, no brandName) and none are submitted", async () => {
    const input: CampaignBuilderInput = { ...BASE_INPUT, targetingStrategy: "auto" };
    const result = await simulator.run({
      ...input,
      userAdjustedCampaigns: [
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.negativeRouting).toBe(100);
  });

  it("negativeRouting = 0 when the user submits no negatives but some are expected", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
          negativeKeywords: [],
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
          negativeKeywords: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.negativeRouting).toBe(0);
  });

  it("negativeRouting scores strictly between 0 and 100 for partially-correct routing", async () => {
    const preview = await simulator.run(BASE_INPUT);
    const manualGT = preview.campaigns.find((c) => c.name.includes("Manual"))!;
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: manualGT.name,
          type: manualGT.type,
          dailyBudget: manualGT.dailyBudget,
          adGroups: manualGT.adGroups,
          negativeKeywords: manualGT.negativeKeywords,
        },
        {
          name: "SP | Auto | wireless earbuds | ₱25/d",
          type: "sponsored-products",
          dailyBudget: 25,
          adGroups: [],
          negativeKeywords: [],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.negativeRouting).toBeGreaterThan(0);
    expect(result.scoreDimensions!.negativeRouting).toBeLessThan(100);
  });

  it("negativeRouting punishes an irrelevant negative on the wrong campaign (precision)", async () => {
    const preview = await simulator.run(BASE_INPUT);
    const allCorrect = preview.campaigns.map((c) => ({
      name: c.name,
      type: c.type,
      dailyBudget: c.dailyBudget,
      adGroups: c.adGroups,
      negativeKeywords: c.negativeKeywords,
    }));
    const withExtra = allCorrect.map((c) =>
      c.name.includes("SB")
        ? {
            ...c,
            negativeKeywords: [
              ...(c.negativeKeywords ?? []),
              {
                text: "totally unrelated term",
                matchType: "negativeExact" as const,
                level: "campaign" as const,
                reason: "irrelevant",
              },
            ],
          }
        : c,
    );
    const clean = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns: allCorrect });
    const dirty = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns: withExtra });
    expect(dirty.scoreDimensions!.negativeRouting).toBeLessThan(
      clean.scoreDimensions!.negativeRouting!,
    );
  });
});

// ── STORY-084 Stage 1: duplicateControl ─────────────────────────────────────

describe("duplicateControl scoring (STORY-084)", () => {
  it("duplicateControl = 100 when there are no duplicate keyword+matchType targets", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [{ keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 }],
            },
          ],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.duplicateControl).toBe(100);
  });

  it("duplicateControl = 100 when the same text appears with different match types (not a duplicate)", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
                { keyword: "wireless earbuds", matchType: "phrase", suggestedBid: 0.32 },
              ],
            },
          ],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.duplicateControl).toBe(100);
  });

  it("duplicateControl drops when the same keyword+matchType is targeted in two ad groups", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [{ keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 }],
            },
            {
              name: "Discovery",
              suggestedBid: 0.4,
              keywords: [{ keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 }],
            },
          ],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.duplicateControl).toBeLessThan(100);
  });

  it("duplicateControl treats case/whitespace variants of the same keyword as duplicates", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "Wireless Earbuds", matchType: "exact", suggestedBid: 0.4 },
                { keyword: " wireless earbuds ", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
          negativeKeywords: [],
        },
      ],
    });
    expect(result.scoreDimensions!.duplicateControl).toBeLessThan(100);
  });

  it("duplicateControl = 100 when there are no keywords at all", async () => {
    const result = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns: [] });
    expect(result.scoreDimensions!.duplicateControl).toBe(100);
  });
});

// ── STORY-084 Stage 2: brandedIsolation ─────────────────────────────────────

describe("brandedIsolation scoring (STORY-084)", () => {
  it("brandedIsolation = 100 when no brand taxonomy is configured for the scenario", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "acme wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.scoreDimensions!.brandedIsolation).toBe(100);
  });

  it("brandedIsolation = 100 when branded keywords are correctly confined to the Brand campaign", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      brandName: "Acme",
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [{ keyword: "wireless earbuds", matchType: "exact", suggestedBid: 0.4 }],
            },
          ],
        },
        {
          name: "SB | Brand | wireless earbuds | ₱15/d",
          type: "sponsored-brands",
          dailyBudget: 15,
          adGroups: [
            {
              name: "Headlines",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "acme wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.scoreDimensions!.brandedIsolation).toBe(100);
  });

  it("brandedIsolation drops when a branded keyword leaks into a non-Brand campaign", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      brandName: "Acme",
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "acme wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.scoreDimensions!.brandedIsolation).toBeLessThan(100);
  });

  it("brandedIsolation penalizes a competitor-brand keyword anywhere, since no competitor campaign exists", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      competitorBrands: ["Beats"],
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "beats wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.scoreDimensions!.brandedIsolation).toBeLessThan(100);
  });

  it("brandedIsolation does not false-positive on a generic word that merely contains a brand-term substring", async () => {
    // Word-boundary matching -- "ace" should not fire inside "spacer".
    const result = await simulator.run({
      ...BASE_INPUT,
      brandName: "Ace",
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [
            {
              name: "Core",
              suggestedBid: 0.4,
              keywords: [
                { keyword: "spacer wireless earbuds", matchType: "exact", suggestedBid: 0.4 },
              ],
            },
          ],
        },
      ],
    });
    expect(result.scoreDimensions!.brandedIsolation).toBe(100);
  });
});

// ── STORY-084 Stage 2: namingCompliance ─────────────────────────────────────

describe("namingCompliance scoring (STORY-084)", () => {
  it("namingCompliance = 100 when every campaign matches the 7-segment house convention", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "Acme | B0EXAMPLE1 | SP | Research | Keyword | Exact | Core",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.namingCompliance).toBe(100);
  });

  it("namingCompliance = 0 when a campaign name doesn't have 7 pipe-delimited segments", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "SP | Manual | wireless earbuds | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.namingCompliance).toBe(0);
  });

  it("namingCompliance rejects a name containing a currency symbol", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "Acme | B0EXAMPLE1 | SP | Research | Keyword | Exact | ₱60/d",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.namingCompliance).toBe(0);
  });

  it("namingCompliance rejects 'gen' as a stand-in for 'Research'", async () => {
    const result = await simulator.run({
      ...BASE_INPUT,
      userAdjustedCampaigns: [
        {
          name: "Acme | B0EXAMPLE1 | SP | gen | Keyword | Exact | Core",
          type: "sponsored-products",
          dailyBudget: 60,
          adGroups: [],
        },
      ],
    });
    expect(result.scoreDimensions!.namingCompliance).toBe(0);
  });

  it("namingCompliance = 0 when the user provides no campaigns", async () => {
    const result = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns: [] });
    expect(result.scoreDimensions!.namingCompliance).toBe(0);
  });
});

// ── STORY-084 Stage 2: budget reconciliation edge cases ─────────────────────

describe("budgetAllocation reconciliation edge cases (STORY-084)", () => {
  it("total-reconciliation gate fails when total daily spend exceeds accountDailyBudgetCap", async () => {
    // Exactly matches GT (₱100/d total, split 60/25/15) -- would otherwise
    // be a perfect 100, but the account cap forces totalReconciliation to
    // 0: round(0.4*0 + 0.6*100) = 60.
    const result = await simulator.run({
      ...BASE_INPUT,
      accountDailyBudgetCap: 50,
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
    expect(result.scoreDimensions!.budgetAllocation).toBe(60);
  });

  it("total-reconciliation gate is sensitive to a custom planningPeriodDays", async () => {
    const campaigns: CampaignStructure[] = [
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
    ];
    const default30Days = await simulator.run({ ...BASE_INPUT, userAdjustedCampaigns: campaigns });
    const custom15Days = await simulator.run({
      ...BASE_INPUT,
      planningPeriodDays: 15,
      userAdjustedCampaigns: campaigns,
    });
    expect(default30Days.scoreDimensions!.budgetAllocation).toBe(100);
    expect(custom15Days.scoreDimensions!.budgetAllocation).toBeLessThan(100);
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
