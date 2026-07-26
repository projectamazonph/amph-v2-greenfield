/**
 * CampaignBuilderSimulator: generates Amazon PPC campaign structures from requirements.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 *
 * Given product category, budget, and targeting strategy, produces a recommended
 * campaign structure: campaigns, ad groups, keywords, match types, and starting bids.
 *
 * When userAdjustedCampaigns are provided, grades the student's self-built structure
 * against the ground-truth structure, computing per-dimension scores.
 *
 * Scoring dimensions:
 *  structureQuality : % of ground-truth campaign types the user covered
 *  budgetAllocation : % of user campaigns with budget within 50% of ground truth
 *  keywordRelevance : % of user keywords containing niche words
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { CampaignBuilderInput } from "./CampaignBuilderInput";
import type {
  CampaignBuilderOutput,
  CampaignStructure,
  AdGroup,
  KeywordSuggestion,
  MatchType,
  ScoreDimensions,
} from "./CampaignBuilderOutput";

const BASE_CPC = 0.4;

const MATCH_TYPE_MULTIPLIER: Record<MatchType, number> = {
  exact: 1.0,
  phrase: 0.8,
  broad: 0.6,
};

// ── Keyword generation ───────────────────────────────────────────────────

function generateKeywords(niche: string): KeywordSuggestion[] {
  const lower = niche.toLowerCase();
  const words = lower.split(/\s+/);

  const templates: Array<[string, MatchType]> = [
    [lower, "exact"],
    [`${lower} for men`, "exact"],
    [`${lower} for women`, "exact"],
    [`best ${lower}`, "phrase"],
    [`cheap ${lower}`, "phrase"],
    [`buy ${lower}`, "phrase"],
    [`${words[0]} ${words[words.length - 1]}`, "broad"],
  ];

  return templates.map(([keyword, matchType]) => ({
    keyword,
    matchType,
    suggestedBid: Math.round(BASE_CPC * MATCH_TYPE_MULTIPLIER[matchType] * 100) / 100,
  }));
}

// ── Ground-truth budget allocations ────────────────────────────────────

interface GroundTruthBudget {
  spManual: number;
  spAuto: number;
  sb: number;
}

function groundTruthBudgets(dailyBudget: number): GroundTruthBudget {
  return {
    spManual: Math.round(dailyBudget * 0.6 * 100) / 100,
    spAuto: Math.round(dailyBudget * 0.25 * 100) / 100,
    sb: Math.round(dailyBudget * 0.15 * 100) / 100,
  };
}

// ── Campaign naming helpers ──────────────────────────────────────────────

function formatBudgetPhp(amount: number): string {
  return `₱${Math.round(amount)}`;
}

function campaignName(
  campaignType: "SP" | "SB" | "SD",
  matchType: string,
  niche: string,
  dailyBudget: number,
): string {
  return `${campaignType} | ${matchType} | ${niche} | ${formatBudgetPhp(dailyBudget)}/d`;
}

function adGroupName(matchType: string, niche: string, purpose: string): string {
  return `${purpose} - ${matchType} - ${niche}`;
}

// ── Ad group factory ─────────────────────────────────────────────────────

function buildAdGroup(name: string, keywords: KeywordSuggestion[]): AdGroup {
  const avgBid =
    keywords.length > 0
      ? Math.round((keywords.reduce((sum, k) => sum + k.suggestedBid, 0) / keywords.length) * 100) /
        100
      : 0;
  return { name, keywords, suggestedBid: avgBid };
}

// ── Campaign factory ─────────────────────────────────────────────────────

function buildCampaign(
  name: string,
  type: CampaignStructure["type"],
  dailyBudget: number,
  adGroups: AdGroup[],
): CampaignStructure {
  return { name, type, dailyBudget, adGroups };
}

// ── Ground truth generator ────────────────────────────────────────────────

function generateGroundTruth(
  monthlyBudget: number,
  targetingStrategy: CampaignBuilderInput["targetingStrategy"],
  productNiche: string,
): { campaigns: CampaignStructure[]; gtBudgets: GroundTruthBudget } {
  const dailyBudget = Math.round((monthlyBudget / 30) * 100) / 100;
  const keywords = generateKeywords(productNiche);
  const gtBudgets = groundTruthBudgets(dailyBudget);
  const campaigns: CampaignStructure[] = [];

  // SP Manual
  if (targetingStrategy === "manual" || targetingStrategy === "hybrid") {
    campaigns.push(
      buildCampaign(
        campaignName("SP", "Manual", productNiche, gtBudgets.spManual),
        "sponsored-products",
        gtBudgets.spManual,
        [
          buildAdGroup(adGroupName("Exact", productNiche, "Core"), keywords.slice(0, 3)),
          buildAdGroup(adGroupName("Phrase", productNiche, "Discovery"), keywords.slice(3)),
        ],
      ),
    );
  }

  // SP Auto (always present)
  campaigns.push(
    buildCampaign(
      campaignName("SP", "Auto", productNiche, gtBudgets.spAuto),
      "sponsored-products",
      gtBudgets.spAuto,
      [buildAdGroup(adGroupName("Auto", productNiche, "Catch-all"), [])],
    ),
  );

  // Sponsored Brands (budget threshold)
  if (monthlyBudget >= 500) {
    campaigns.push(
      buildCampaign(
        campaignName("SB", "Brand", productNiche, gtBudgets.sb),
        "sponsored-brands",
        gtBudgets.sb,
        [buildAdGroup(adGroupName("Brand", productNiche, "Headlines"), [])],
      ),
    );
  }

  return { campaigns, gtBudgets };
}

// ── Ground truth structural signature ─────────────────────────────────────

interface GTStructure {
  hasSpManual: boolean;
  hasSpAuto: boolean;
  hasSb: boolean;
  spManualAgCount: number;
  spAutoAgCount: number;
  sbAgCount: number;
  allGtKeywords: string[];
}

function extractGTStructure(gtCampaigns: CampaignStructure[]): GTStructure {
  const spManual = gtCampaigns.find((c) => c.name.includes("Manual"));
  const spAuto = gtCampaigns.find((c) => c.name.includes("Auto"));
  const sb = gtCampaigns.find((c) => c.name.includes("SB"));

  const allGtKeywords: string[] = [];
  for (const c of gtCampaigns) {
    for (const ag of c.adGroups) {
      for (const kw of ag.keywords) {
        allGtKeywords.push(kw.keyword);
      }
    }
  }

  return {
    hasSpManual: !!spManual,
    hasSpAuto: !!spAuto,
    hasSb: !!sb,
    spManualAgCount: spManual?.adGroups.length ?? 0,
    spAutoAgCount: spAuto?.adGroups.length ?? 0,
    sbAgCount: sb?.adGroups.length ?? 0,
    allGtKeywords,
  };
}

// ── Scoring helpers ───────────────────────────────────────────────────────

/** Returns the ground-truth budget for a campaign type, or null if not applicable. */
function getGTBudget(
  gtBudgets: GroundTruthBudget,
  campaignType: CampaignStructure["type"],
  matchType: string,
): number | null {
  if (campaignType === "sponsored-products") {
    if (matchType.includes("Manual")) return gtBudgets.spManual;
    return gtBudgets.spAuto;
  }
  if (campaignType === "sponsored-brands") return gtBudgets.sb;
  return null;
}

/**
 * Check if user's budget for a campaign is within 50% of the ground truth.
 */
function isBudgetAcceptable(userBudget: number, gtBudget: number): boolean {
  if (gtBudget === 0) return true;
  const ratio = userBudget / gtBudget;
  return ratio >= 0.5 && ratio <= 2.0;
}

/**
 * Check if a keyword contains at least one word from the niche.
 */
function keywordMatchesNiche(keyword: string, nicheWords: string[]): boolean {
  const kwLower = keyword.toLowerCase();
  return nicheWords.some((w) => kwLower.includes(w));
}

// ── Dimension scoring ─────────────────────────────────────────────────────

function computeDimensionScores(
  userCampaigns: readonly CampaignStructure[],
  gtCampaigns: CampaignStructure[],
  gtBudgets: GroundTruthBudget,
  productNiche: string,
): ScoreDimensions {
  const gt = extractGTStructure(gtCampaigns);
  const nicheWords = productNiche.toLowerCase().split(/\s+/);

  // structureQuality: % of expected campaign types covered
  const expectedTypes = (gt.hasSpManual ? 1 : 0) + (gt.hasSpAuto ? 1 : 0) + (gt.hasSb ? 1 : 0);
  const coveredTypes =
    (gt.hasSpManual && userCampaigns.some((c) => c.name.includes("Manual")) ? 1 : 0) +
    (gt.hasSpAuto && userCampaigns.some((c) => c.name.includes("Auto")) ? 1 : 0) +
    (gt.hasSb && userCampaigns.some((c) => c.name.includes("SB")) ? 1 : 0);
  const structureQuality = expectedTypes > 0 ? Math.round((coveredTypes / expectedTypes) * 100) : 0;

  // budgetAllocation: % of user's campaigns with budget within 50% of ground truth
  let budgetOkCount = 0;
  let totalGtCampaigns = 0;
  for (const gtCamp of gtCampaigns) {
    const matchType = gtCamp.name.includes("Manual")
      ? "Manual"
      : gtCamp.name.includes("Auto")
        ? "Auto"
        : "Brand";
    const gtBudget = getGTBudget(gtBudgets, gtCamp.type, matchType);
    if (gtBudget === null) continue;
    totalGtCampaigns++;

    // Find user's campaign of the same type closest to the GT budget
    const userMatch = userCampaigns.find((c) => {
      if (c.type !== gtCamp.type) return false;
      if (gtCamp.name.includes("Manual") && !c.name.includes("Manual")) return false;
      if (gtCamp.name.includes("Auto") && !c.name.includes("Auto")) return false;
      return true;
    });
    if (userMatch && isBudgetAcceptable(userMatch.dailyBudget, gtBudget)) {
      budgetOkCount++;
    }
  }
  const budgetAllocation =
    totalGtCampaigns > 0 ? Math.round((budgetOkCount / totalGtCampaigns) * 100) : 0;

  // keywordRelevance: % of user keywords that contain niche words
  const allUserKeywords: string[] = [];
  for (const c of userCampaigns) {
    for (const ag of c.adGroups) {
      for (const kw of ag.keywords) {
        allUserKeywords.push(kw.keyword);
      }
    }
  }
  const relevantKeywords = allUserKeywords.filter((kw) => keywordMatchesNiche(kw, nicheWords));
  const keywordRelevance =
    allUserKeywords.length > 0
      ? Math.round((relevantKeywords.length / allUserKeywords.length) * 100)
      : 0;

  return { structureQuality, budgetAllocation, keywordRelevance };
}

// ── Simulator ───────────────────────────────────────────────────────────

export class CampaignBuilderSimulator implements Simulator<
  CampaignBuilderInput,
  CampaignBuilderOutput
> {
  readonly simulatorId = "campaign-builder" as const;
  readonly name = "Campaign Builder";

  async run(input: CampaignBuilderInput): Promise<CampaignBuilderOutput> {
    const { monthlyBudget, targetingStrategy, productNiche, userAdjustedCampaigns } = input;

    if (monthlyBudget <= 0) {
      return { campaigns: [], score: 0, scoreDimensions: null };
    }

    const { campaigns: gtCampaigns, gtBudgets } = generateGroundTruth(
      monthlyBudget,
      targetingStrategy,
      productNiche,
    );

    // Legacy structural completeness score
    const hasManual = targetingStrategy !== "auto";
    const hasAuto = targetingStrategy !== "manual";
    const hasBrands = monthlyBudget >= 500;
    let score = 50;
    if (hasManual && hasAuto) score += 25;
    if (hasBrands) score += 15;
    score = Math.min(100, score);

    // Compute dimension scores if user provided their structure
    let scoreDimensions: ScoreDimensions | null = null;

    if (userAdjustedCampaigns !== undefined) {
      scoreDimensions = computeDimensionScores(
        userAdjustedCampaigns,
        gtCampaigns,
        gtBudgets,
        productNiche,
      );
      score = scoreDimensions.structureQuality; // primary dimension
    }

    return { campaigns: gtCampaigns, score, scoreDimensions };
  }
}
