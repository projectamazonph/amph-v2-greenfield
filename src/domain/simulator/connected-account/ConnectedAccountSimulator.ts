/**
 * ConnectedAccountSimulator — Connected-Account Simulator.
 *
 * STORY-089. The simulator mirrors a (mock) Amazon Advertising API:
 * the scenario carries a campaign snapshot (per-keyword economics) and
 * a recent Search Term Report (per-term performance), the student
 * responds with bid adjustments and triage decisions, and `gradeAttempt()`
 * (called via `run()`) scores the response against the ground truth
 * baked into the scenario.
 *
 * No external API dependency on a live Amazon account. The simulator
 * always reads from the scenario published via the admin UI; that
 * scenario is the only source of truth for what the student sees.
 *
 * Why a sixth simulator: AGENTS.md Rule 5 forbids a sixth registry
 * entry without a story, a domain module, a published scenario, and a
 * simulator registry validator. This file plus the seeding in
 * `scripts/seed-simulator-scenarios.ts` and the validator at
 * `scripts/validate-simulator-registry.ts` are what unlock the rule.
 *
 * Grading rules (formative only):
 *
 *   bidAccuracy
 *     For each keyword, compute the ground-truth optimal bid as
 *     `(targetAcosPct / 100) * (avgOrderValue * cvr) / max(ctr, 0.001)`
 *     where ctr = clicks / impressions and cvr = sales / clicks when
 *     orders > 0, else 0. The keyword's user bid is optimal when it
 *     lands within ±5% of that target. Score is the share of keywords
 *     landing in the band, 0-100.
 *
 *   triageAccuracy
 *     The scenario labels each search term with a ground-truth action:
 *     winners get keep, bleeders get negate_exact, watch-list terms
 *     (orders == 0, clicks > 0, sales == 0) get pause. The user's
 *     action is correct when it equals the ground truth. Score is the
 *     share of terms where the user's action equals the ground truth,
 *     0-100. Equivalence classes (negate_exact vs negate_phrase) do
 *     not count as equal — exactness matters in production STR triage.
 *
 * Pure function. No constructor dependencies. No IO.
 */

import type { Simulator } from "@/ports/simulator/Simulator";
import type {
  ConnectedAccountBidDecision,
  ConnectedAccountInput,
  ConnectedAccountKeyword,
  ConnectedAccountScenario,
  ConnectedAccountSearchTerm,
  ConnectedAccountTriageAction,
} from "./ConnectedAccountInput";
import type {
  ConnectedAccountKeywordResult,
  ConnectedAccountOutput,
  ConnectedAccountScoreDimensions,
  ConnectedAccountSearchTermResult,
} from "./ConnectedAccountOutput";

/** ±5% window around the optimal bid. Mirrors BidElevator's leeway. */
const OPTIMAL_BID_TOLERANCE_PCT = 5;

/**
 * Compute the ground-truth optimal bid for one keyword under the
 * scenario's target ACoS.
 *
 *     optimalBid = (targetAcosPct/100) * (orderValue * cvr) / ctr
 *
 * Falls back to the keyword's current bid when the keyword has no
 * measurable CTR or CVR (zero impressions, or zero orders with no
 * sales) — the answer "do nothing" is the right answer for a
 * keyword with no signal, and the score rewards "do nothing" as
 * long as it lands in the ±5% band around current bid.
 */
function computeOptimalBidMinor(keyword: ConnectedAccountKeyword, targetAcosPct: number): number {
  if (keyword.impressions <= 0) return keyword.currentBidMinor;
  const ctr = keyword.clicks / keyword.impressions;
  const cvr = keyword.clicks > 0 ? Math.min(keyword.salesMinor / keyword.clicks / 100, 1) : 0;
  // avgOrderValue ≈ sales / max(orders, 1) is unavailable without an
  // explicit orders column, so derive a proxy from sales / clicks when
  // there is any revenue (cvr > 0). With no orders, the keyword has
  // nothing to optimize and we fall back to the current bid.
  if (cvr <= 0) return keyword.currentBidMinor;
  const avgOrderValueProxy = Math.max(keyword.salesMinor / Math.max(keyword.clicks * cvr, 1), 0);
  const optimal = ((targetAcosPct / 100) * (avgOrderValueProxy * cvr)) / Math.max(ctr, 0.001);
  return Math.round(optimal);
}

/**
 * Decide the ground-truth triage action for one search term. Winners
 * (orders > 0, sales > spend) get keep; bleeders (orders == 0 but
 * spend > 0) get negate_exact; watch-list terms (orders == 0, sales
 * == 0) get pause. Terms with no spend and no clicks get keep
 * because there is nothing to do.
 */
function computeGroundTruthAction(term: ConnectedAccountSearchTerm): ConnectedAccountTriageAction {
  if (term.clicks <= 0) return "keep";
  if (term.orders > 0) {
    return term.salesMinor > term.spendMinor ? "optimize" : "keep";
  }
  // No orders. Decide between negate and pause based on click volume:
  // a single click with no order is a watch-list (pause), more than
  // one click is clearly negative (negate_exact).
  return term.clicks >= 2 ? "negate_exact" : "pause";
}

/** True when the keyword carries real signal (sales > 0). */
function isWinnerKeyword(keyword: ConnectedAccountKeyword): boolean {
  return keyword.salesMinor > 0 && keyword.clicks > 0;
}

/** True when the keyword wasted spend without any sales. */
function isBleederKeyword(keyword: ConnectedAccountKeyword): boolean {
  return keyword.clicks > 0 && keyword.salesMinor <= 0;
}

function withinOptimalBand(
  currentBidMinor: number,
  optimalBidMinor: number,
  tolerancePct: number,
): boolean {
  if (optimalBidMinor <= 0) {
    // Optimal bid is 0 (no measurable CTR/CVR); a buyer's bid within
    // ±tolerance% of zero is vacuously correct. We instead require the
    // user to leave the bid unchanged from current, since "do nothing"
    // is the only defensible answer for a keyword with no signal.
    return currentBidMinor === 0;
  }
  const delta = Math.abs(currentBidMinor - optimalBidMinor);
  const tolerance = (optimalBidMinor * tolerancePct) / 100;
  return delta <= tolerance;
}

export class ConnectedAccountSimulator implements Simulator<
  ConnectedAccountInput,
  ConnectedAccountOutput
> {
  readonly simulatorId = "connected-account" as const;
  readonly name = "Connected Account";

  async run(input: ConnectedAccountInput): Promise<ConnectedAccountOutput> {
    const { scenario, bidDecisions, triageDecisions } = input;
    const isGraded = bidDecisions !== undefined && triageDecisions !== undefined;

    const bidDecisionById = new Map<string, ConnectedAccountBidDecision>();
    if (bidDecisions) {
      for (const decision of bidDecisions) {
        bidDecisionById.set(decision.keywordId, decision);
      }
    }

    const triageDecisionById = new Map<string, { action: ConnectedAccountTriageAction }>();
    if (triageDecisions) {
      for (const decision of triageDecisions) {
        triageDecisionById.set(decision.termId, { action: decision.action });
      }
    }

    let correctBidCount = 0;
    let correctTriageCount = 0;

    const keywords: ConnectedAccountKeywordResult[] = scenario.keywords.map((keyword) => {
      const optimalBidMinor = computeOptimalBidMinor(keyword, scenario.targetAcosPct);
      const result: ConnectedAccountKeywordResult = {
        keywordId: keyword.keywordId,
        keyword: keyword.keyword,
        matchType: keyword.matchType,
        impressions: keyword.impressions,
        clicks: keyword.clicks,
        spendMinor: keyword.spendMinor,
        salesMinor: keyword.salesMinor,
        currentBidMinor: keyword.currentBidMinor,
        optimalBidMinor,
        isWinner: isWinnerKeyword(keyword),
        isBleeder: isBleederKeyword(keyword),
      };

      if (isGraded) {
        const decision = bidDecisionById.get(keyword.keywordId);
        if (decision) {
          const userNewBidMinor = decision.newBidMinor;
          const isBidOptimal = withinOptimalBand(
            userNewBidMinor,
            optimalBidMinor,
            OPTIMAL_BID_TOLERANCE_PCT,
          );
          Object.assign(result, { userNewBidMinor, isBidOptimal });
          if (isBidOptimal) correctBidCount += 1;
        }
      }

      return result;
    });

    const searchTerms: ConnectedAccountSearchTermResult[] = scenario.searchTerms.map((term) => {
      const groundTruthAction = computeGroundTruthAction(term);
      const result: ConnectedAccountSearchTermResult = {
        termId: term.termId,
        term: term.term,
        clicks: term.clicks,
        spendMinor: term.spendMinor,
        salesMinor: term.salesMinor,
        orders: term.orders,
        groundTruthAction,
      };

      if (isGraded) {
        const decision = triageDecisionById.get(term.termId);
        if (decision) {
          const userAction = decision.action;
          const isTriageCorrect = userAction === groundTruthAction;
          Object.assign(result, { userAction, isTriageCorrect });
          if (isTriageCorrect) correctTriageCount += 1;
        }
      }

      return result;
    });

    let scoreDimensions: ConnectedAccountScoreDimensions | null = null;
    let score = 100;

    if (isGraded) {
      const bidAccuracy =
        scenario.keywords.length > 0
          ? Math.round((correctBidCount / scenario.keywords.length) * 100)
          : 100;
      const triageAccuracy =
        scenario.searchTerms.length > 0
          ? Math.round((correctTriageCount / scenario.searchTerms.length) * 100)
          : 100;
      scoreDimensions = { bidAccuracy, triageAccuracy };
      score = Math.round((bidAccuracy + triageAccuracy) / 2);
    }

    return {
      campaignName: scenario.campaignName,
      currencyCode: scenario.currencyCode,
      dailyBudgetMinor: scenario.dailyBudgetMinor,
      targetAcosPct: scenario.targetAcosPct,
      keywords,
      searchTerms,
      score,
      scoreDimensions,
    };
  }
}

// Pure helpers exported for test reachability without re-running
// computeOptimalBidMinor / computeGroundTruthAction from inside a
// spec. They are not part of the simulator's runtime contract.
export const __testOnly = {
  computeOptimalBidMinor,
  computeGroundTruthAction,
  withinOptimalBand,
  isWinnerKeyword,
  isBleederKeyword,
  OPTIMAL_BID_TOLERANCE_PCT,
};

/**
 * Stand-in for a real Amazon Advertising API client: pure-function
 * score-of-attempt that the production app-layer calls through the
 * registered registry. Mirrors the signature other simulators expose
 * for the same reason (the gradeAttempt helper in the existing
 * BidElevator and ListingAudit simulators, where applicable).
 */
export function gradeAttempt(input: ConnectedAccountInput): Promise<ConnectedAccountOutput> {
  return new ConnectedAccountSimulator().run(input);
}
