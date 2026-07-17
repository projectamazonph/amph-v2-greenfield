/**
 * CampaignBuilderSimulator — generates Amazon PPC campaign structures from requirements.
 *
 * STORY-039: Campaign Builder simulator.
 *
 * Given product category, budget, and targeting strategy, produces a recommended
 * campaign structure: campaigns, ad groups, keywords, match types, and starting bids.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { CampaignBuilderInput } from "./CampaignBuilderInput";
import type {
  CampaignBuilderOutput,
  CampaignStructure,
  AdGroup,
  KeywordSuggestion,
  MatchType,
} from "./CampaignBuilderOutput";

// ── Keyword stem templates ─────────────────────────────────────────────────

/** Generate keyword suggestions from a product niche. */
function generateKeywords(niche: string): KeywordSuggestion[] {
  const lower = niche.toLowerCase();
  const words = lower.split(/\s+/);

  const templates: Array<[string, MatchType]> = [
    [`${lower}`, "exact"],
    [`${lower} for men`, "exact"],
    [`${lower} for women`, "exact"],
    [`best ${lower}`, "phrase"],
    [`cheap ${lower}`, "phrase"],
    [`buy ${lower}`, "phrase"],
    [`${words[0]} ${words[words.length - 1]}`, "broad"],
  ];

  // Estimate CPC as 20% of a $2.00 baseline, adjust per match type
  const baseCpc = 0.4;
  const matchTypeMultiplier: Record<MatchType, number> = {
    exact: 1.0,
    phrase: 0.8,
    broad: 0.6,
  };

  return templates.map(([keyword, matchType]) => ({
    keyword,
    matchType,
    suggestedBid: Math.round(baseCpc * matchTypeMultiplier[matchType] * 100) / 100,
  }));
}

// ── Ad group factory ───────────────────────────────────────────────────────

function buildAdGroup(name: string, keywords: KeywordSuggestion[]): AdGroup {
  const avgBid = keywords.reduce((sum, k) => sum + k.suggestedBid, 0) / keywords.length;
  return {
    name,
    keywords,
    suggestedBid: Math.round(avgBid * 100) / 100,
  };
}

// ── Campaign factory ───────────────────────────────────────────────────────

function buildCampaign(
  name: string,
  type: CampaignStructure["type"],
  dailyBudget: number,
  adGroups: AdGroup[],
): CampaignStructure {
  return { name, type, dailyBudget, adGroups };
}

// ── Simulator ───────────────────────────────────────────────────────────────

export class CampaignBuilderSimulator implements Simulator<
  CampaignBuilderInput,
  CampaignBuilderOutput
> {
  readonly simulatorId = "campaign-builder" as const;
  readonly name = "Campaign Builder";

  async run(input: CampaignBuilderInput): Promise<CampaignBuilderOutput> {
    const { productCategory, monthlyBudget, targetingStrategy, productNiche } = input;

    if (monthlyBudget <= 0) {
      return { campaigns: [], score: 0 };
    }

    const dailyBudget = Math.round((monthlyBudget / 30) * 100) / 100;
    const keywords = generateKeywords(productNiche);

    const campaigns: CampaignStructure[] = [];

    // ── Always: Sponsored Products (manual targeting) ──────────
    if (targetingStrategy === "manual" || targetingStrategy === "hybrid") {
      campaigns.push(
        buildCampaign(`${productCategory} — Manual`, "sponsored-products", dailyBudget * 0.6, [
          buildAdGroup(`${productNiche} — Core`, keywords.slice(0, 3)),
          buildAdGroup(`${productNiche} — Long-tail`, keywords.slice(3)),
        ]),
      );
    }

    // ── Auto campaign: all strategies ─────────────────────────
    campaigns.push(
      buildCampaign(`${productCategory} — Auto`, "sponsored-products", dailyBudget * 0.25, [
        buildAdGroup(`${productNiche} — Auto`, []),
      ]),
    );

    // ── Sponsored Brands: only for larger budgets ───────────────
    if (monthlyBudget >= 500) {
      campaigns.push(
        buildCampaign(`${productCategory} — Brands`, "sponsored-brands", dailyBudget * 0.15, [
          buildAdGroup(`${productNiche} — Brand`, []),
        ]),
      );
    }

    // ── Score: structural completeness ─────────────────────────
    const hasManual = targetingStrategy !== "auto";
    const hasAuto = targetingStrategy !== "manual";
    const hasBrands = monthlyBudget >= 500;

    let score = 50; // base
    if (hasManual && hasAuto) score += 25; // hybrid bonus
    if (hasBrands) score += 15;
    if (keywords.length >= 4) score += 10;
    score = Math.min(100, score);

    return { campaigns, score };
  }
}
