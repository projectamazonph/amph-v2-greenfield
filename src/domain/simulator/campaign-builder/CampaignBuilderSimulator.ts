/**
 * CampaignBuilderSimulator: generates Amazon PPC campaign structures from requirements.
 *
 * STORY-069: Campaign Builder Rebuild (Scoring Engine Integration).
 * STORY-084: Campaign Builder strategic scoring -- see
 * docs/stories/STORY-084.md for the full decision record. Expands the
 * 3-dimension scoring engine (structural completeness, +-50% budget
 * tolerance, niche substring match) to 7 dimensions: negative-keyword
 * routing, duplicate-target detection, branded-traffic isolation, naming-
 * convention compliance, ad-group match-type purity, and tightened budget
 * reconciliation (+-2% total, +-10pp per-role).
 *
 * Given product category, budget, and targeting strategy, produces a recommended
 * campaign structure: campaigns, ad groups, keywords, match types, and starting bids.
 *
 * When userAdjustedCampaigns are provided, grades the student's self-built structure
 * against the ground-truth structure, computing per-dimension scores.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { CampaignBuilderInput } from "./CampaignBuilderInput";
import type {
  CampaignBuilderOutput,
  CampaignStructure,
  AdGroup,
  KeywordSuggestion,
  MatchType,
  NegativeKeyword,
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
  negativeKeywords: readonly NegativeKeyword[] = [],
): CampaignStructure {
  return { name, type, dailyBudget, adGroups, negativeKeywords };
}

// ── Ground truth negative-keyword routing (STORY-084) ───────────────────────
//
// Two concrete, structurally-derivable routing rules from Ryan's broader
// decision table (docs/stories/STORY-084.md), plus brand protection:
//  1. Auto -> Manual: SP Auto gets a negative-exact entry for every Core
//     (Exact) keyword, so Auto doesn't compete with Manual's proven winners.
//  2. Phrase -> Exact isolation: Manual's Discovery (Phrase) ad group gets a
//     negative-exact entry for every Core (Exact) keyword, so the same term
//     doesn't run both match types within one campaign.
//  3. Brand protection: every non-Brand campaign gets `brandName` as a
//     negative-exact entry, when provided -- keeps branded search out of
//     non-brand traffic. The SB (Brand) campaign is the designated
//     "Defense" role and never gets this negative (branded traffic belongs
//     there).

function negativeFromKeyword(
  kw: KeywordSuggestion,
  level: NegativeKeyword["level"],
  reason: string,
): NegativeKeyword {
  return { text: kw.keyword, matchType: "negativeExact", level, reason };
}

function brandProtectionNegative(brandName: string): NegativeKeyword {
  return {
    text: brandName,
    matchType: "negativeExact",
    level: "campaign",
    reason: "Keep branded search traffic in the Brand/Defense campaign, not here.",
  };
}

// ── Ground truth generator ────────────────────────────────────────────────

function generateGroundTruth(
  monthlyBudget: number,
  targetingStrategy: CampaignBuilderInput["targetingStrategy"],
  productNiche: string,
  brandName: string | undefined,
): { campaigns: CampaignStructure[]; gtBudgets: GroundTruthBudget } {
  const dailyBudget = Math.round((monthlyBudget / 30) * 100) / 100;
  const keywords = generateKeywords(productNiche);
  const gtBudgets = groundTruthBudgets(dailyBudget);
  const campaigns: CampaignStructure[] = [];

  const hasManual = targetingStrategy === "manual" || targetingStrategy === "hybrid";
  const coreKeywords = keywords.slice(0, 3);
  const discoveryKeywords = keywords.slice(3);
  const brandNegatives = brandName ? [brandProtectionNegative(brandName)] : [];

  // SP Manual
  if (hasManual) {
    campaigns.push(
      buildCampaign(
        campaignName("SP", "Manual", productNiche, gtBudgets.spManual),
        "sponsored-products",
        gtBudgets.spManual,
        [
          buildAdGroup(adGroupName("Exact", productNiche, "Core"), coreKeywords),
          buildAdGroup(adGroupName("Phrase", productNiche, "Discovery"), discoveryKeywords),
        ],
        [
          ...coreKeywords.map((k) =>
            negativeFromKeyword(
              k,
              "adGroup",
              "Isolate Discovery (Phrase) from Core (Exact) -- the same keyword shouldn't run both match types in this campaign.",
            ),
          ),
          ...brandNegatives,
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
      [
        ...(hasManual
          ? coreKeywords.map((k) =>
              negativeFromKeyword(
                k,
                "campaign",
                "Auto shouldn't compete with Manual's proven exact-match winners.",
              ),
            )
          : []),
        ...brandNegatives,
      ],
    ),
  );

  // Sponsored Brands (budget threshold) -- the designated Brand/Defense
  // campaign; branded traffic belongs here, so no brand-protection negative.
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

/**
 * Check if a keyword contains at least one word from the niche.
 */
function keywordMatchesNiche(keyword: string, nicheWords: string[]): boolean {
  const kwLower = keyword.toLowerCase();
  return nicheWords.some((w) => kwLower.includes(w));
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase();
}

/** Same role-matching convention `computeDimensionScores` already uses for budget matching. */
function roleOf(campaign: CampaignStructure): "manual" | "auto" | "sb" | null {
  if (campaign.name.includes("Manual")) return "manual";
  if (campaign.name.includes("Auto")) return "auto";
  if (campaign.name.includes("SB")) return "sb";
  return null;
}

/**
 * F1 of the user's submitted negative keywords against the flattened
 * expected-negative set, matched by (role, normalized text, matchType) so a
 * negative submitted on the right campaign role counts even if the user
 * named their campaign differently from the ground truth.
 */
function computeNegativeRouting(
  userCampaigns: readonly CampaignStructure[],
  gtCampaigns: readonly CampaignStructure[],
): number {
  const expected = new Set<string>();
  for (const gtCamp of gtCampaigns) {
    const role = roleOf(gtCamp);
    if (!role) continue;
    for (const neg of gtCamp.negativeKeywords ?? []) {
      expected.add(`${role}::${normalizeText(neg.text)}::${neg.matchType}`);
    }
  }

  const submitted = new Set<string>();
  for (const userCamp of userCampaigns) {
    const role = roleOf(userCamp);
    if (!role) continue;
    for (const neg of userCamp.negativeKeywords ?? []) {
      submitted.add(`${role}::${normalizeText(neg.text)}::${neg.matchType}`);
    }
  }

  if (expected.size === 0) {
    // No negatives expected (e.g. no brandName, auto-only targeting) --
    // the correct outcome is submitting none.
    return submitted.size === 0 ? 100 : 0;
  }

  const hits = [...expected].filter((e) => submitted.has(e)).length;
  const recall = hits / expected.size;
  const precision = submitted.size === 0 ? 0 : hits / submitted.size;
  if (recall + precision === 0) return 0;
  return Math.round(((2 * recall * precision) / (recall + precision)) * 100);
}

/**
 * Duplicate-target detection (STORY-084). The story's 4-factor rule (ASIN +
 * campaign role + brand lane + targeting objective) collapses to this one
 * check in our single-ASIN, single-scenario model, where the other 3
 * factors are always held constant: the same normalized keyword text +
 * matchType appearing in more than one ad group across the user's own
 * campaigns is a duplicate target.
 */
function computeDuplicateControl(userCampaigns: readonly CampaignStructure[]): number {
  const occurrences = new Map<string, number>();
  let total = 0;
  for (const c of userCampaigns) {
    for (const ag of c.adGroups) {
      for (const kw of ag.keywords) {
        total++;
        const key = `${normalizeText(kw.keyword)}::${kw.matchType}`;
        occurrences.set(key, (occurrences.get(key) ?? 0) + 1);
      }
    }
  }
  if (total === 0) return 100;

  let duplicateCount = 0;
  for (const count of occurrences.values()) {
    if (count > 1) duplicateCount += count - 1;
  }
  return Math.max(0, 100 - Math.round((duplicateCount / total) * 100));
}

/**
 * "One match type per ad group" house rule (STORY-084) -- a training-
 * architecture rule, not an Amazon platform limitation. An ad group with
 * no keywords has nothing to violate and isn't counted.
 */
function computeMatchTypePurity(userCampaigns: readonly CampaignStructure[]): number {
  let checkedAdGroups = 0;
  let pureAdGroups = 0;
  for (const c of userCampaigns) {
    for (const ag of c.adGroups) {
      if (ag.keywords.length === 0) continue;
      checkedAdGroups++;
      const matchTypes = new Set(ag.keywords.map((k) => k.matchType));
      if (matchTypes.size === 1) pureAdGroups++;
    }
  }
  if (checkedAdGroups === 0) return 100;
  return Math.round((pureAdGroups / checkedAdGroups) * 100);
}

/**
 * Budget reconciliation (STORY-084): plannedSpend = sum(dailyBudget) x
 * planningPeriodDays must land within +-2% of monthlyBudget, and must not
 * exceed accountDailyBudgetCap. A hard gate (0 or 100), matching "require
 * planned spend within +-2%" rather than a graduated tolerance.
 */
function computeBudgetReconciliation(
  userCampaigns: readonly CampaignStructure[],
  monthlyBudget: number,
  planningPeriodDays: number,
  accountDailyBudgetCap: number,
): number {
  const totalDailyBudget = userCampaigns.reduce((sum, c) => sum + c.dailyBudget, 0);
  if (totalDailyBudget > accountDailyBudgetCap) return 0;

  const plannedSpend = totalDailyBudget * planningPeriodDays;
  if (monthlyBudget === 0) return plannedSpend === 0 ? 100 : 0;

  const deviation = Math.abs(plannedSpend - monthlyBudget) / monthlyBudget;
  return deviation <= 0.02 ? 100 : 0;
}

/**
 * Per-role budget allocation (STORY-084): each GT role's (Manual/Auto/SB)
 * share of the user's total daily budget must land within +-10 percentage
 * points of that role's target share (the existing 60/25/15 split from
 * `groundTruthBudgets()`). Checked against every role present in the
 * ground truth, not just roles the user happened to submit -- an omitted
 * role scores 0% share, which naturally fails tolerance rather than being
 * silently skipped.
 */
function computePerRoleAllocation(
  userCampaigns: readonly CampaignStructure[],
  gtCampaigns: readonly CampaignStructure[],
): number {
  const gtRoles = new Set(
    gtCampaigns.map((c) => roleOf(c)).filter((r): r is "manual" | "auto" | "sb" => r !== null),
  );
  if (gtRoles.size === 0) return 100;

  const roleTargetShare: Record<"manual" | "auto" | "sb", number> = {
    manual: 0.6,
    auto: 0.25,
    sb: 0.15,
  };
  const totalUserDaily = userCampaigns.reduce((sum, c) => sum + c.dailyBudget, 0);

  let withinTolerance = 0;
  for (const role of gtRoles) {
    const roleDaily = userCampaigns
      .filter((c) => roleOf(c) === role)
      .reduce((sum, c) => sum + c.dailyBudget, 0);
    const roleShare = totalUserDaily === 0 ? 0 : roleDaily / totalUserDaily;
    if (Math.abs(roleShare - roleTargetShare[role]) <= 0.1) withinTolerance++;
  }
  return Math.round((withinTolerance / gtRoles.size) * 100);
}

/** Word-boundary match, same approach as listing-audit's containsAny. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function containsBrandTerm(text: string, terms: readonly string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => {
    const term = t.trim().toLowerCase();
    if (term.length === 0) return false;
    return new RegExp(`\\b${escapeRegExp(term)}\\b`).test(lower);
  });
}

/**
 * Branded-traffic isolation (STORY-084): own-brand terms belong only in
 * the Brand/Defense (SB) campaign; competitor terms belong in a dedicated
 * competitor campaign, which this ground-truth structure never generates,
 * so any competitor-brand keyword anywhere is a violation. Returns 100
 * when no brand taxonomy is configured for this scenario -- nothing to
 * isolate.
 */
function computeBrandedIsolation(
  userCampaigns: readonly CampaignStructure[],
  input: CampaignBuilderInput,
): number {
  const brandTerms = [
    ...(input.brandName ? [input.brandName] : []),
    ...(input.brandAliases ?? []),
    ...(input.brandMisspellings ?? []),
    ...(input.brandProductNames ?? []),
  ];
  const competitorTerms = input.competitorBrands ?? [];
  if (brandTerms.length === 0 && competitorTerms.length === 0) return 100;

  let totalKeywords = 0;
  let violations = 0;
  for (const c of userCampaigns) {
    const isBrandCampaign = c.name.includes("SB") || c.name.includes("Brand");
    for (const ag of c.adGroups) {
      for (const kw of ag.keywords) {
        totalKeywords++;
        if (containsBrandTerm(kw.keyword, competitorTerms)) {
          violations++;
          continue;
        }
        if (containsBrandTerm(kw.keyword, brandTerms) && !isBrandCampaign) {
          violations++;
        }
      }
    }
  }
  if (totalKeywords === 0) return 100;
  return Math.max(0, 100 - Math.round((violations / totalKeywords) * 100));
}

/**
 * House naming convention (STORY-084): `Brand | ASIN | Channel | Strategy
 * | Target Type | Match | Label` -- exactly 7 pipe-delimited segments, no
 * currency symbols in the name, and the Strategy segment isn't literally
 * "gen" (Ryan's decision: "Research," not "gen").
 */
function isNamingCompliant(campaign: CampaignStructure): boolean {
  const segments = campaign.name.split("|").map((s) => s.trim());
  if (segments.length !== 7 || segments.some((s) => s.length === 0)) return false;
  if (/[₱$]/.test(campaign.name)) return false;
  const strategySegment = segments[3] ?? "";
  if (/\bgen\b/i.test(strategySegment)) return false;
  return true;
}

function computeNamingCompliance(userCampaigns: readonly CampaignStructure[]): number {
  if (userCampaigns.length === 0) return 0;
  const compliant = userCampaigns.filter(isNamingCompliant).length;
  return Math.round((compliant / userCampaigns.length) * 100);
}

// ── Dimension scoring ─────────────────────────────────────────────────────

function computeDimensionScores(
  userCampaigns: readonly CampaignStructure[],
  gtCampaigns: CampaignStructure[],
  gtBudgets: GroundTruthBudget,
  input: CampaignBuilderInput,
): ScoreDimensions {
  const { productNiche, monthlyBudget } = input;
  const planningPeriodDays = input.planningPeriodDays ?? 30;
  const accountDailyBudgetCap = input.accountDailyBudgetCap ?? Infinity;
  const gt = extractGTStructure(gtCampaigns);
  const nicheWords = productNiche.toLowerCase().split(/\s+/);

  // structureQuality: % of expected campaign types covered, averaged with
  // ad-group match-type purity (STORY-084's "one match type per ad group").
  const expectedTypes = (gt.hasSpManual ? 1 : 0) + (gt.hasSpAuto ? 1 : 0) + (gt.hasSb ? 1 : 0);
  const coveredTypes =
    (gt.hasSpManual && userCampaigns.some((c) => c.name.includes("Manual")) ? 1 : 0) +
    (gt.hasSpAuto && userCampaigns.some((c) => c.name.includes("Auto")) ? 1 : 0) +
    (gt.hasSb && userCampaigns.some((c) => c.name.includes("SB")) ? 1 : 0);
  const campaignTypeCoverage =
    expectedTypes > 0 ? Math.round((coveredTypes / expectedTypes) * 100) : 0;
  const matchTypePurity = computeMatchTypePurity(userCampaigns);
  const structureQuality = Math.round((campaignTypeCoverage + matchTypePurity) / 2);

  // budgetAllocation (STORY-084 rewrite): 40% total reconciliation (+-2%,
  // hard gate) + 60% per-role allocation accuracy (+-10pp), replacing the
  // old +-50%-per-campaign tolerance.
  const totalReconciliation = computeBudgetReconciliation(
    userCampaigns,
    monthlyBudget,
    planningPeriodDays,
    accountDailyBudgetCap,
  );
  const perRoleAllocation = computePerRoleAllocation(userCampaigns, gtCampaigns);
  const budgetAllocation = Math.round(0.4 * totalReconciliation + 0.6 * perRoleAllocation);

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

  const negativeRouting = computeNegativeRouting(userCampaigns, gtCampaigns);
  const duplicateControl = computeDuplicateControl(userCampaigns);
  const brandedIsolation = computeBrandedIsolation(userCampaigns, input);
  const namingCompliance = computeNamingCompliance(userCampaigns);

  return {
    keywordRelevance,
    structureQuality,
    negativeRouting,
    budgetAllocation,
    brandedIsolation,
    duplicateControl,
    namingCompliance,
  };
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
      input.brandName,
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
        input,
      );
      score = scoreDimensions.structureQuality; // primary dimension
    }

    return { campaigns: gtCampaigns, score, scoreDimensions };
  }
}
