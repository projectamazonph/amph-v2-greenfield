/**
 * StrTriageSimulator: categorizes Amazon PPC search terms into action buckets.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 * STORY-082: Expand STR Triage classifier. Replaces the hardcoded
 * `avgSpendPerKeyword = 25` constant with the economics of one expected
 * conversion (targetCpa) and a statistical zero-order click threshold,
 * adds existing-target detection, negative-exact-vs-phrase precision
 * rules, per-brand-class target-ROAS routing, and a real
 * "insufficient_data" action. See docs/stories/STORY-082.md.
 *
 * Classification, in priority order, per search term:
 *  1. Brand detection (word-boundary lexicon match) -> ownBrand |
 *     competitorBrand | generic, each with its own target ROAS.
 *  2. elapsedDays < minElapsedDays -> insufficient_data (not enough time
 *     to be confident about anything yet).
 *  3. orders > 0: needs >= effectiveMinOrders (competitor terms need
 *     >= 3 regardless of the scenario default) AND roas >= the term's
 *     brand-class target ROAS to be a confident winner; short of either
 *     bar -> insufficient_data (evidence exists but isn't enough yet) or
 *     pause (enough orders to be confident, but genuinely unprofitable).
 *     A confident winner is harvested to Exact (existing-target rules
 *     may downgrade this to `keep`), UNLESS it's an own-brand term
 *     outside a Defense campaign, which gets routed there instead.
 *  4. orders === 0: a confident loser needs spend >= targetCpa AND
 *     clicks >= the statistical zero-order threshold AND impressions >=
 *     the CTR-evaluation floor (so a term is never negated on a small,
 *     noisy sample) -- otherwise insufficient_data. A confident loser
 *     defaults to negative_exact; negative_phrase only when the term is
 *     a competitor term (isolation requires catching every variation),
 *     matches a scenario-authored incompatible-attribute phrase, or
 *     shares a significant word with >= 2 other confident-loser generic
 *     terms (a proven irrelevant theme) -- a second pass across all rows,
 *     since it can't be decided from one row alone.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type { StrTriageInput, SearchTermRow, ExistingTarget, CampaignRole } from "./StrTriageInput";
import type { BrandClass } from "./StrTriageInput";
import type {
  StrTriageOutput,
  KeywordClassification,
  TriageAction,
  ScoreDimensions,
} from "./StrTriageOutput";

export type { BrandClass } from "./StrTriageInput";

const REMOVAL_ACTIONS: ReadonlySet<TriageAction> = new Set([
  "pause",
  "negative_exact",
  "negative_phrase",
]);

const STOPWORDS = new Set(["the", "and", "for", "with", "your", "from", "this", "that", "are"]);

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesLexicon(term: string, lexicon: readonly string[]): boolean {
  const normalizedTerm = normalize(term);
  return lexicon.some((entry) => {
    const normalizedEntry = normalize(entry);
    if (normalizedEntry.length === 0) return false;
    return new RegExp(`\\b${escapeRegExp(normalizedEntry)}\\b`).test(normalizedTerm);
  });
}

function detectBrandClass(
  term: string,
  brandLexicon: readonly string[],
  competitorBrandLexicon: readonly string[],
): BrandClass {
  if (matchesLexicon(term, brandLexicon)) return "ownBrand";
  if (matchesLexicon(term, competitorBrandLexicon)) return "competitorBrand";
  return "generic";
}

/**
 * ceil(log(1 - confidenceLevel) / log(1 - expectedCvr)) -- the clicks
 * needed before zero conversions becomes statistically meaningful at the
 * given confidence level. Clamped away from the 0/1 boundaries so a
 * scenario-authored 0% or 100% CVR/confidence can't produce NaN/Infinity.
 */
function zeroOrderClickThreshold(confidenceLevel: number, expectedCvrPct: number): number {
  const cvr = Math.min(0.999999, Math.max(0.000001, expectedCvrPct / 100));
  const confidence = Math.min(0.999999, Math.max(0, confidenceLevel));
  return Math.max(0, Math.ceil(Math.log(1 - confidence) / Math.log(1 - cvr)));
}

/** max(250, ceil(5 / expectedCtr)) -- floor on impressions before a term's CTR is trusted. */
function minImpressionsForCtrEvaluation(expectedCtrPct: number): number {
  const ctr = Math.max(0.0001, expectedCtrPct / 100);
  return Math.max(250, Math.ceil(5 / ctr));
}

function calcRoas(row: { spend: number; sales: number }): number {
  if (row.spend <= 0) return 0;
  return row.sales / row.spend;
}

function targetRoasForBrandClass(
  brandClass: BrandClass,
  ctx: Pick<StrTriageInput, "brandTargetRoas" | "genericTargetRoas" | "competitorTargetRoas">,
): number {
  if (brandClass === "ownBrand") return ctx.brandTargetRoas;
  if (brandClass === "competitorBrand") return ctx.competitorTargetRoas;
  return ctx.genericTargetRoas;
}

function findExistingTargetMatch(
  row: SearchTermRow,
  existingTargets: readonly ExistingTarget[],
): ExistingTarget | undefined {
  const normalizedSearchTerm = normalize(row.searchTerm);
  const live = existingTargets.filter((t) => t.state !== "archived");
  const exact = live.find(
    (t) => t.matchType === "exact" && t.normalizedText === normalizedSearchTerm,
  );
  if (exact) return exact;
  return live.find(
    (t) =>
      (t.matchType === "phrase" || t.matchType === "broad") &&
      t.normalizedText === normalizedSearchTerm,
  );
}

function harvestDecision(existingMatch: ExistingTarget | undefined): {
  action: TriageAction;
  reasoning: string;
} {
  if (existingMatch?.matchType === "exact") {
    return {
      action: "keep",
      reasoning: `Already targeted as Exact in campaign "${existingMatch.campaignId}" -- maintain or adjust the bid, don't duplicate.`,
    };
  }
  if (existingMatch) {
    return {
      action: "harvest_exact",
      reasoning: `Currently only ${existingMatch.matchType} in campaign "${existingMatch.campaignId}" -- harvest to Exact for isolated control, and add a negative-exact to the source Research campaign to keep it isolated.`,
    };
  }
  return {
    action: "harvest_exact",
    reasoning: "Winning term with no existing exact target -- harvest as a new Exact target.",
  };
}

function significantTokens(normalizedTerm: string): string[] {
  return normalizedTerm.split(" ").filter((w) => w.length >= 3 && !STOPWORDS.has(w));
}

interface RowContext {
  readonly row: SearchTermRow;
  readonly normalizedTerm: string;
  readonly brandClass: BrandClass;
  readonly roas: number;
}

export class StrTriageSimulator implements Simulator<StrTriageInput, StrTriageOutput> {
  readonly simulatorId = "str-triage" as const;
  readonly name = "STR Triage";

  async run(input: StrTriageInput): Promise<StrTriageOutput> {
    const { rows, userClassifications } = input;

    if (rows.length === 0) {
      return this.emptyResult();
    }

    const groundTruths = this.classifyAll(rows, input);
    const classifications: KeywordClassification[] = groundTruths.map((gt) => {
      const userChoice = userClassifications?.[gt.searchTerm];
      return {
        ...gt,
        userChoice,
        isCorrect: userChoice !== undefined && userChoice === gt.groundTruth,
      };
    });

    const scoreDimensions =
      userClassifications !== undefined ? this.computeDimensionScores(classifications, rows) : null;

    const score = scoreDimensions !== null ? scoreDimensions.direction : 100;

    return { classifications, scoreDimensions, score };
  }

  /**
   * Classify every row. Two passes: (1) each row's ground truth in
   * isolation, (2) escalate negative_exact -> negative_phrase for generic
   * terms that share a significant word with >= 2 other confident-loser
   * generic terms (a proven irrelevant theme spanning >= 3 distinct terms).
   */
  private classifyAll(
    rows: readonly SearchTermRow[],
    input: StrTriageInput,
  ): Array<Omit<KeywordClassification, "isCorrect" | "userChoice">> {
    const contexts: RowContext[] = rows.map((row) => ({
      row,
      normalizedTerm: normalize(row.searchTerm),
      brandClass: detectBrandClass(
        row.searchTerm,
        input.brandLexicon,
        input.competitorBrandLexicon,
      ),
      roas: calcRoas(row),
    }));

    const preliminary = contexts.map((ctx) => this.classifyOne(ctx, input));

    this.escalateThemedNegatives(contexts, preliminary);

    return contexts.map((ctx, i) => {
      const p = preliminary[i]!;
      return {
        searchTerm: ctx.row.searchTerm,
        groundTruth: p.action,
        roas: ctx.roas,
        spend: ctx.row.spend,
        brandClass: ctx.brandClass,
        reasoning: p.reasoning,
        routingNote: p.routingNote,
      };
    });
  }

  private classifyOne(
    ctx: RowContext,
    input: StrTriageInput,
  ): { action: TriageAction; reasoning: string; routingNote: string | null } {
    const { row, brandClass, roas } = ctx;
    const targetRoas = targetRoasForBrandClass(brandClass, input);
    const targetCpa = input.averageOrderValue * (1 / targetRoas);
    const clickThreshold = zeroOrderClickThreshold(input.confidenceLevel, input.expectedCvrPct);
    const impressionFloor = minImpressionsForCtrEvaluation(input.expectedCtrPct);

    const wrongLaneRoutingNote = this.wrongLaneRoutingNote(brandClass, input.sourceCampaignRole);

    if (row.elapsedDays < input.minElapsedDays) {
      return {
        action: "insufficient_data",
        reasoning: `Only ${row.elapsedDays} day(s) elapsed; need at least ${input.minElapsedDays} before any confident decision.`,
        routingNote: wrongLaneRoutingNote,
      };
    }

    if (row.orders > 0) {
      const effectiveMinOrders =
        brandClass === "competitorBrand"
          ? Math.max(input.minOrdersForWinner, 3)
          : input.minOrdersForWinner;

      if (row.orders < effectiveMinOrders) {
        return {
          action: "insufficient_data",
          reasoning: `${row.orders} order(s), fewer than the ${effectiveMinOrders} needed to confidently call a winner.`,
          routingNote: wrongLaneRoutingNote,
        };
      }

      if (roas < targetRoas) {
        return {
          action: "pause",
          reasoning: `${row.orders} order(s) is enough evidence, but ROAS ${roas.toFixed(2)}x is below the ${targetRoas.toFixed(2)}x target for this brand class.`,
          routingNote: wrongLaneRoutingNote,
        };
      }

      if (brandClass === "ownBrand" && input.sourceCampaignRole !== "defense") {
        return {
          action: "harvest_exact",
          reasoning: `Own-brand winner (ROAS ${roas.toFixed(2)}x) -- own-brand terms belong in a Defense campaign even when profitable.`,
          routingNote: `Route to a Defense campaign; found in a "${input.sourceCampaignRole}" campaign instead.`,
        };
      }

      const existingMatch = findExistingTargetMatch(row, input.existingTargets);
      const { action, reasoning } = harvestDecision(existingMatch);
      return { action, reasoning, routingNote: wrongLaneRoutingNote };
    }

    // orders === 0
    const hasEnoughEvidence =
      row.spend >= targetCpa && row.clicks >= clickThreshold && row.impressions >= impressionFloor;

    if (!hasEnoughEvidence) {
      return {
        action: "insufficient_data",
        reasoning:
          "Zero orders, but spend/clicks/impressions haven't yet crossed the evidence thresholds to confidently negate.",
        routingNote: wrongLaneRoutingNote,
      };
    }

    if (brandClass === "competitorBrand") {
      return {
        action: "negative_phrase",
        reasoning:
          "Confident zero-order loser and a competitor term -- isolate every variation containing the competitor phrase, not just this exact query.",
        routingNote: wrongLaneRoutingNote,
      };
    }

    if (matchesLexicon(row.searchTerm, input.incompatibleAttributeLexicon ?? [])) {
      return {
        action: "negative_phrase",
        reasoning:
          "Matches a scenario-authored incompatible attribute -- always exclude this phrase.",
        routingNote: wrongLaneRoutingNote,
      };
    }

    return {
      action: "negative_exact",
      reasoning: `Confident zero-order loser: spend ${row.spend.toFixed(2)} >= target CPA ${targetCpa.toFixed(2)}, ${row.clicks} clicks >= threshold ${clickThreshold}.`,
      routingNote: wrongLaneRoutingNote,
    };
  }

  private wrongLaneRoutingNote(
    brandClass: BrandClass,
    sourceCampaignRole: CampaignRole,
  ): string | null {
    if (brandClass !== "ownBrand" && sourceCampaignRole === "defense") {
      return `Non-branded/competitor term found in a Defense campaign -- consider restructuring into the correct lane.`;
    }
    return null;
  }

  /**
   * Escalate negative_exact -> negative_phrase for generic-brand-class
   * terms that share a significant word with >= 2 other confident-loser
   * generic terms (>= 3 distinct terms total sharing the theme). Each
   * member already independently cleared the per-row evidence gate
   * (spend/clicks/impressions) before reaching this preliminary
   * negative_exact state, so the group's combined evidence is already
   * sufficient by construction -- this pass only tests "is the theme
   * proven across enough distinct terms."
   */
  private escalateThemedNegatives(
    contexts: readonly RowContext[],
    preliminary: Array<{ action: TriageAction; reasoning: string; routingNote: string | null }>,
  ): void {
    const candidateIndices = preliminary
      .map((p, i) => i)
      .filter(
        (i) => preliminary[i]!.action === "negative_exact" && contexts[i]!.brandClass === "generic",
      );

    const termsByToken = new Map<string, Set<number>>();
    for (const i of candidateIndices) {
      for (const token of significantTokens(contexts[i]!.normalizedTerm)) {
        if (!termsByToken.has(token)) termsByToken.set(token, new Set());
        termsByToken.get(token)!.add(i);
      }
    }

    for (const i of candidateIndices) {
      const tokens = significantTokens(contexts[i]!.normalizedTerm);
      const provenToken = tokens.find((t) => (termsByToken.get(t)?.size ?? 0) >= 3);
      if (provenToken !== undefined) {
        const count = termsByToken.get(provenToken)!.size;
        preliminary[i] = {
          action: "negative_phrase",
          reasoning: `Shares "${provenToken}" with ${count - 1} other confident-loser term(s) -- a proven irrelevant theme, not a one-off.`,
          routingNote: preliminary[i]!.routingNote,
        };
      }
    }
  }

  private computeDimensionScores(
    classifications: readonly KeywordClassification[],
    rows: readonly SearchTermRow[],
  ): ScoreDimensions {
    return {
      direction: this.scoreDirection(classifications),
      profitability: this.scoreProfitability(classifications, rows),
      reviewCoverage: this.scoreReviewCoverage(classifications, rows),
    };
  }

  private scoreDirection(classifications: readonly KeywordClassification[]): number {
    if (classifications.length === 0) return 100;
    const correct = classifications.filter((c) => c.isCorrect).length;
    return Math.round((correct / classifications.length) * 100);
  }

  /**
   * % of revenue preserved on terms whose ground truth was NOT a removal
   * action (pause/negative_exact/negative_phrase). Penalizes removing a
   * term that should have been kept/harvested; rewards correctly
   * preserving it.
   */
  private scoreProfitability(
    classifications: readonly KeywordClassification[],
    rows: readonly SearchTermRow[],
  ): number {
    if (classifications.length === 0) return 100;

    const salesByTerm = new Map<string, number>();
    for (const row of rows) {
      salesByTerm.set(row.searchTerm, row.sales);
    }

    let nonRemovableRevenue = 0;
    let preservedRevenue = 0;
    for (const c of classifications) {
      if (!REMOVAL_ACTIONS.has(c.groundTruth)) {
        const revenue = salesByTerm.get(c.searchTerm) ?? 0;
        nonRemovableRevenue += revenue;
        if (c.userChoice === c.groundTruth) {
          preservedRevenue += revenue;
        }
      }
    }

    if (nonRemovableRevenue === 0) return 100;
    return Math.round((preservedRevenue / nonRemovableRevenue) * 100);
  }

  private scoreReviewCoverage(
    classifications: readonly KeywordClassification[],
    rows: readonly SearchTermRow[],
  ): number {
    if (rows.length === 0) return 100;
    const reviewed = classifications.filter((c) => c.userChoice !== undefined).length;
    return Math.round((reviewed / rows.length) * 100);
  }

  private emptyResult(): StrTriageOutput {
    return {
      classifications: [],
      scoreDimensions: null,
      score: 100,
    };
  }
}
