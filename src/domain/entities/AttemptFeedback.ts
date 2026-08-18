/**
 * AttemptFeedback — domain entity for simulator attempt feedback + remediation.
 *
 * STORY-066: Feedback Composer + Remediation Recommendations.
 *
 * A pure domain function that composes actionable feedback from a graded
 * SimulatorAttempt and its ScorePolicy. No side effects, no external calls.
 *
 * All data needed (score, scoreDimensions, decisions) is already in the
 * graded attempt. Remediation recommendations are static templates keyed
 * by verdict and dimension.
 */

import type { Difficulty, SimulatorId } from "@/domain/entities/SimulatorScenario";
import type {
  AttemptStatus,
  SimulatorAttempt,
  SimulatorMode,
  ScoreDimensions,
} from "@/domain/entities/SimulatorAttempt";
import type { ScorePolicy } from "@/domain/entities/ScorePolicy";
import { isPassed as policyIsPassed } from "@/domain/entities/ScorePolicy";

// ── Types ────────────────────────────────────────────────────────────────

export type FeedbackVerdict = "excellent" | "good" | "fair" | "poor";

export interface DimensionFeedback {
  readonly dimension: string;
  readonly verdict: FeedbackVerdict;
  readonly score: number;
  readonly comment: string;
  readonly recommendation: string;
}

export interface AttemptFeedback {
  readonly attemptId: string;
  readonly userId: string;
  readonly simulatorId: SimulatorId;
  readonly scenarioId: string;
  readonly difficulty: Difficulty;
  readonly mode: SimulatorMode;
  readonly overallScore: number;
  readonly passed: boolean;
  readonly overallComment: string;
  readonly remediationLinks: readonly string[];
  readonly dimensionFeedback: readonly DimensionFeedback[];
  readonly completedAt: Date;
}

export interface ComposeAttemptFeedbackParams {
  readonly attempt: Pick<
    SimulatorAttempt,
    | "id"
    | "userId"
    | "simulatorId"
    | "scenarioId"
    | "difficulty"
    | "mode"
    | "score"
    | "scoreDimensions"
    | "decisions"
  >;
  readonly policy: ScorePolicy;
}

// ── Verdict helpers ──────────────────────────────────────────────────────

function getVerdict(score: number): FeedbackVerdict {
  if (score >= 90) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  return "poor";
}

// ── Comment + recommendation templates ─────────────────────────────────
//
// STORY-087: keyed to each simulator's *current* ScoreDimensions field
// names (bid-elevator: bidAccuracy/budgetAdherence/roasHit; str-triage:
// direction/profitability; listing-audit: direction/priorityCoverage;
// campaign-builder: structureQuality/budgetAllocation/keywordRelevance;
// keyword-research: intentAccuracy/negativeIdentification) — the previous
// table was keyed to dimension names (direction as a bid-elevator concept,
// magnitude, dataSufficiency, explanation) that were renamed or removed by
// STORY-071/072/076, so every real dimension except `profitability` fell
// through to the generic "Score of X on Y" fallback below. Each entry is a
// function of the actual score so the copy states the real percentage and
// what it means in concrete terms, not just an abstract verdict label.
// `reviewCoverage` (str-triage, listing-audit) is a non-gradable submission
// gate (STORY-072) and never reaches GradeSimulatorAttempt, so it has no
// entry here — it can't appear in a graded attempt's scoreDimensions.

type DimensionCopyFn = (score: number) => string;

const DIMENSION_COMMENTS: Record<string, Record<FeedbackVerdict, DimensionCopyFn>> = {
  // bid-elevator: % of bids within the evidence-supported tolerance band
  bidAccuracy: {
    excellent: (s) =>
      `${s}% of your bids landed in the range the data supported. No keywords were left underfunded or pushed past the evidence.`,
    good: (s) =>
      `${s}% of your bids were well-calibrated. The rest were probably based on gut feel instead of the CTR/CVR evidence. Review them before scaling.`,
    fair: (s) =>
      `${s}% of your bids matched what the data supported. Close to half your keywords were mispriced, which in a real account means budget drifting toward the wrong terms.`,
    poor: (s) =>
      `Only ${s}% of your bids matched the evidence. At this error rate, a real campaign would be losing money on overpriced clicks while starving the keywords that actually convert.`,
  },
  // bid-elevator: how much budget was used efficiently before pacing throttled
  budgetAdherence: {
    excellent: (s) =>
      `Your bids kept spend on pace all day (${s}%). The budget was neither exhausted early nor left sitting unspent.`,
    good: (s) =>
      `${s}% budget adherence. You're close, but a few bids are probably running hot enough to throttle the campaign before the day ends, or low enough to leave spend on the table.`,
    fair: (s) =>
      `${s}% adherence means the daily budget likely ran out early or under-delivered. Either way, real ad spend was not doing its job for part of the day.`,
    poor: (s) =>
      `${s}% adherence is a real budget-management problem. This bid set would spend the cap early or barely spend it at all.`,
  },
  // bid-elevator: hit target ROAS while capturing available sales, without bidding past the profitable ceiling
  roasHit: {
    excellent: () =>
      `You hit the target ROAS while capturing the sales that were available. That is the profitable outcome, not just a passing score.`,
    good: (s) =>
      `Close to target ROAS (${s}%). You're leaving some profitable sales on the table, or shaving margin thinner than the target allows.`,
    fair: (s) =>
      `${s}% of the profitable outcome achieved. This bid set would land meaningfully under target ROAS, which a client would ask about.`,
    poor: (s) =>
      `${s}%. This bid set either chases unprofitable sales or leaves too much useful volume uncaptured to reach target ROAS.`,
  },
  // campaign-builder: % match of campaign types + ad group coverage vs. ground truth
  structureQuality: {
    excellent: (s) =>
      `Your campaign structure covers the launch types this niche and budget actually call for (${s}%).`,
    good: (s) =>
      `${s}% structural coverage. You are missing a campaign type this niche would need at launch. That is often the gap between a campaign that runs and one that performs.`,
    fair: (s) =>
      `${s}% coverage means real gaps in the structure. You are likely missing the auto-discovery layer, the brand-defense layer, or both.`,
    poor: (s) =>
      `${s}% structural coverage is thin for this budget and niche. A structure this incomplete would leave real discovery and defense gaps from day one.`,
  },
  // campaign-builder: % of user keywords containing words from the product niche
  keywordRelevance: {
    excellent: (s) =>
      `${s}% of your keywords are clearly on-niche. That leaves little risk of spend leaking to irrelevant search traffic.`,
    good: (s) =>
      `${s}% relevance. A handful of keywords look like they'd pull in traffic outside what this product actually serves.`,
    fair: (s) =>
      `${s}% relevance means real budget risk. Enough off-niche keywords could send spend to searches that do not convert.`,
    poor: (s) =>
      `${s}% relevance is a real problem. This keyword set would spend against traffic that has nothing to do with the product.`,
  },
  // campaign-builder: F1 of submitted negatives against the expected routing set (STORY-084)
  negativeRouting: {
    excellent: (s) =>
      `${s}% of your negative-keyword routing matches how this structure needs protection. Auto is not cannibalizing Manual's winners, and match types are not competing against themselves.`,
    good: (s) =>
      `${s}% routing accuracy. A negative or two is missing. Auto may be bidding against a keyword Manual already owns, which wastes spend.`,
    fair: (s) =>
      `${s}% routing accuracy means real internal cannibalization. Campaigns are bidding against each other for the same searches.`,
    poor: (s) =>
      `${s}%. With almost no negative routing, this structure would inflate CPCs by bidding against itself.`,
  },
  // campaign-builder: budget reconciliation (STORY-084)
  budgetAllocation: {
    excellent: (s) =>
      `Your budget reconciles cleanly (${s}%). The total matches the approved amount, and each campaign role has a sensible share.`,
    good: (s) =>
      `${s}% budget accuracy. Either the total is slightly off from what was approved, or one campaign role is funded meaningfully more or less than its job calls for.`,
    fair: (s) =>
      `${s}% accuracy is a real reconciliation problem. This is the kind of budget gap that shows up in a monthly spend report.`,
    poor: (s) =>
      `${s}%. The budget does not match what was approved. Some campaigns would be starved while others overspend.`,
  },
  // campaign-builder: % of keywords correctly kept out of/confined to branded traffic (STORY-084)
  brandedIsolation: {
    excellent: (s) =>
      `${s}% branded-traffic isolation. Your brand terms stay in Defense, and nothing here bids on a competitor's name.`,
    good: (s) =>
      `${s}% isolation. A branded or competitor term has leaked into the wrong campaign, which either wastes spend on traffic you already own or opens a fight you didn't mean to start.`,
    fair: (s) =>
      `${s}% isolation is a real problem. Branded traffic is landing outside Defense, or competitor terms lack containment.`,
    poor: (s) =>
      `${s}%. Branded and competitor traffic are not isolated. Spend would leak into searches this structure was not meant to touch.`,
  },
  // campaign-builder: % of keyword targets that aren't duplicated across ad groups (STORY-084)
  duplicateControl: {
    excellent: (s) =>
      `${s}% duplicate-free. No keyword is competing against itself across two ad groups, so bid pressure goes to one clear target.`,
    good: (s) =>
      `${s}% duplicate control. A keyword or two is targeted in more than one ad group, which means you're bidding against yourself for that search instead of Amazon's other advertisers.`,
    fair: (s) =>
      `${s}% duplicate control means real self-cannibalization. Multiple ad groups are competing for the same auction and driving CPC up.`,
    poor: (s) =>
      `${s}%. A meaningful share of your budget would go toward outbidding your own ad groups instead of winning new customers.`,
  },
  // campaign-builder: % of campaigns matching the house naming convention (STORY-084)
  namingCompliance: {
    excellent: (s) =>
      `${s}% naming compliance. Anyone on the team can tell what each campaign does and how it is funded.`,
    good: (s) =>
      `${s}% compliance. Most names follow the convention; the rest would slow down anyone auditing this account later.`,
    fair: (s) =>
      `${s}% compliance is a real gap. A teammate skimming the account could not reliably tell strategy from label.`,
    poor: (s) =>
      `${s}%. These names would not hold up in a real account. A broken naming convention creates its own maintenance cost.`,
  },
  // keyword-research: correctly classifying keyword intent
  intentAccuracy: {
    excellent: (s) =>
      `${s}% correct intent calls. This is the foundation for the niche's targeting strategy.`,
    good: (s) =>
      `${s}% accuracy. A few keywords are probably filed under the wrong intent bucket, which would nudge match-type and campaign-role decisions downstream.`,
    fair: (s) =>
      `${s}% correct is a real gap. Misclassified intent would send keywords into the wrong campaign role.`,
    poor: (s) =>
      `${s}% correct intent classification would misroute a meaningful share of this keyword list before any campaign is even built.`,
  },
  // keyword-research: flagging keywords that should be excluded
  negativeIdentification: {
    excellent: (s) =>
      `You correctly flagged ${s}% of the keywords that do not belong in this campaign. That prevents wasted spend.`,
    good: (s) =>
      `${s}% of true negatives caught. The ones you missed would slip into a campaign and quietly draw clicks that were never going to convert.`,
    fair: (s) =>
      `${s}% catch rate on negatives. Keywords that should have been excluded could still leak spend.`,
    poor: (s) =>
      `${s}%. Most of the keywords that needed to be negative got through. In a live campaign, that means ongoing wasted spend.`,
  },
  // str-triage: % terms correctly classified; listing-audit: % findings correctly triaged fix/skip
  direction: {
    excellent: (s) =>
      `${s}% correct calls. That consistency compounds into better account performance over time.`,
    good: (s) =>
      `${s}% correct. The misses here are the quiet kind: a decision left standing that should have changed, or vice versa.`,
    fair: (s) =>
      `${s}% correct is a real gap. In a live account, a manager would have to catch and reverse these decisions.`,
    poor: (s) =>
      `${s}% correct is below what a coin flip would get on this decision set. Rebuild the fundamentals before using a live account.`,
  },
  // str-triage: % of non-removal-ground-truth revenue preserved by classification choices
  profitability: {
    excellent: (s) =>
      `Your classification choices preserved ${s}% of the revenue that should have stayed in the campaign. No winning terms were wrongly cut.`,
    good: (s) =>
      `${s}% of revenue preserved. Somewhere in here a term that was actually earning its keep probably got paused or negated.`,
    fair: (s) =>
      `${s}% revenue preservation means real sales were left on the table. Working terms were treated like losers.`,
    poor: (s) =>
      `${s}%. This decision set would cut a meaningful share of revenue-generating terms. That is the opposite of what triage should protect.`,
  },
  // listing-audit: severity-weighted F1 of the student's fix decisions
  priorityCoverage: {
    excellent: (s) =>
      `You fixed what actually mattered (${s}%) without wasting effort on issues that weren't worth touching.`,
    good: (s) =>
      `${s}%. You caught most of the priority issues, but probably spent some effort on low-severity findings while a higher-priority one went untouched.`,
    fair: (s) =>
      `${s}% priority coverage. The fix effort is not matched to what moves listing performance.`,
    poor: (s) =>
      `${s}%. This triage would spend fix effort on the wrong findings and leave conversion and compliance issues unaddressed.`,
  },
};

const DIMENSION_RECOMMENDATIONS: Record<string, Record<FeedbackVerdict, DimensionCopyFn>> = {
  bidAccuracy: {
    excellent: () =>
      "Try a scenario with tighter evidence windows to test your calibration under more uncertainty.",
    good: () =>
      "Before bidding, check each keyword's evidence count. Low-evidence terms deserve more caution.",
    fair: () =>
      "Compare your bid to the benchmark CPC and the keyword's CTR/CVR before adjusting. Do not bid on intuition alone.",
    poor: () =>
      "Start smaller: bid one keyword at a time and check it against the evidence before moving to the next.",
  },
  budgetAdherence: {
    excellent: () =>
      "Move to a scenario with a tighter daily budget to test your pacing discipline.",
    good: () =>
      "Add up your projected spend across all keywords before submitting. Check it against the daily cap.",
    fair: () =>
      "Calculate estimated daily spend per keyword (bid × available impressions × CTR) and total it before submitting.",
    poor: () =>
      "Practice budget math on paper first: bid × impressions × CTR, summed across every keyword, must fit the daily cap.",
  },
  roasHit: {
    excellent: () =>
      "Try a scenario with a higher target ROAS to test your bidding discipline under a tighter margin.",
    good: () =>
      "Check each bid against its economic ceiling, the highest bid that stays profitable, before finalizing.",
    fair: () =>
      "Recalculate your target ROAS from the scenario's break-even ACoS before adjusting any bids.",
    poor: () =>
      "Review how target ROAS, break-even ACoS, and bid ceiling relate before attempting another scenario.",
  },
  structureQuality: {
    excellent: () =>
      "Try a lower-budget scenario to see which campaign types get cut first when budget is tight.",
    good: () =>
      "Review what a manual, auto, and (budget permitting) brand campaign each contribute before finalizing your structure.",
    fair: () =>
      "List the campaign types a real launch for this niche and budget would need before you start adding campaigns.",
    poor: () =>
      "Study a complete reference structure (manual, auto, and brand campaigns) before building your own from scratch.",
  },
  keywordRelevance: {
    excellent: () =>
      "Try a niche with more ambiguous terminology to sharpen your relevance judgment.",
    good: () =>
      "Before adding a keyword, check it actually contains a word describing the product niche, not just a related category.",
    fair: () =>
      "Re-read the product niche description and cut any keyword that doesn't clearly relate to it.",
    poor: () =>
      "Build your keyword list from the niche's own words, then expand outward.",
  },
  negativeRouting: {
    excellent: () =>
      "Try a scenario with more campaign roles to test your negative-keyword routing across a larger structure.",
    good: () =>
      "For every keyword you place in a more specific ad group or campaign, add the matching negative to the broader one it would otherwise still show for.",
    fair: () =>
      "Before submitting, walk each campaign in order (Auto, then Manual's ad groups) and negative out anything the next, more specific level already owns.",
    poor: () =>
      "Study which campaigns should protect which others (Auto vs. Manual, Phrase vs. Exact) before adding a single negative keyword.",
  },
  budgetAllocation: {
    excellent: () =>
      "Try a scenario with a tighter account-level budget cap to test your reconciliation discipline under a real ceiling.",
    good: () =>
      "Add up your daily budgets, multiply by the planning period, and check the total against the approved monthly figure before submitting.",
    fair: () =>
      "Work out each campaign role's target share of the total budget (discovery, performance, defense) before assigning daily budgets.",
    poor: () =>
      "Practice the reconciliation math on paper: sum of daily budgets × planning period should land within a couple percent of the approved monthly figure.",
  },
  brandedIsolation: {
    excellent: () =>
      "Try a scenario with a longer competitor-brand list to sharpen your isolation judgment.",
    good: () =>
      "Before finalizing keywords, check the brand's names, aliases, and misspellings. Keep those terms in Defense.",
    fair: () =>
      "Review which campaign is your Defense (Brand) campaign before assigning any keyword that includes the brand name.",
    poor: () =>
      "Build the brand-taxonomy list first (brand name, aliases, misspellings, competitor names) and check every keyword against it before adding any.",
  },
  duplicateControl: {
    excellent: () =>
      "Try a scenario with more ad groups to test your duplicate-detection discipline at scale.",
    good: () =>
      "Before submitting, scan for the same keyword text appearing in more than one ad group with the same match type.",
    fair: () =>
      "Keep a running list of every keyword+match-type pair as you build ad groups, and check new entries against it before adding them.",
    poor: () =>
      "Build one ad group completely before starting the next, checking each new keyword against everything already placed.",
  },
  namingCompliance: {
    excellent: () =>
      "Try a scenario with more campaigns to test whether you can keep the naming convention consistent at scale.",
    good: () =>
      "Double-check each campaign name against the convention (Brand | ASIN | Channel | Strategy | Target Type | Match | Label) before submitting.",
    fair: () =>
      "Write out the naming convention's 7 segments before naming your first campaign, then fill each one in deliberately.",
    poor: () =>
      "Copy the naming convention template exactly for your first campaign, then adapt it for the rest rather than writing names from scratch.",
  },
  intentAccuracy: {
    excellent: () =>
      "Try a niche with more competitor and cross-category terms to sharpen your intent judgment.",
    good: () =>
      "For each uncertain keyword, ask what the searcher is actually trying to do before assigning an intent.",
    fair: () =>
      "Review the intent taxonomy (core, feature, problem, useCase, competitor, ownBrand, irrelevant) before classifying the next batch.",
    poor: () =>
      'Start by sorting keywords into just "about this product" vs. "not about this product," then refine into the full taxonomy.',
  },
  negativeIdentification: {
    excellent: () =>
      "Try a niche with more overlapping-but-irrelevant terms to sharpen your negative-keyword instincts.",
    good: () =>
      "Before marking a keyword as relevant, ask whether it could also describe a completely different product.",
    fair: () =>
      "Build a checklist of what makes a keyword irrelevant for this niche, and run every keyword against it.",
    poor: () =>
      "Focus on negatives next attempt. Look for terms that do not belong.",
  },
  direction: {
    excellent: () =>
      "Try a scenario with more ambiguous or borderline cases to keep sharpening your judgment.",
    good: () =>
      "For each borderline case, write down the specific evidence that tipped your decision before committing to it.",
    fair: () =>
      "Slow down on cases you are unsure about. Check the underlying numbers again before deciding.",
    poor: () =>
      "Start with the most clear-cut cases first to rebuild the fundamentals before tackling the ambiguous ones.",
  },
  profitability: {
    excellent: () =>
      "Try a scenario with tighter target ROAS thresholds to test your judgment under less margin for error.",
    good: () =>
      "Double-check the ROAS on any term you are about to pause or negate. A losing-looking term can still be a winner.",
    fair: () =>
      "Before removing a term, confirm it's actually underperforming target ROAS, not just spending the most.",
    poor: () =>
      "Review which terms are actually earning their keep (ROAS vs. target) before making any removal decisions.",
  },
  priorityCoverage: {
    excellent: () =>
      "Try a scenario with more findings to keep testing your prioritization under a larger workload.",
    good: () =>
      "Before fixing a low-severity finding, check whether a higher-severity one still needs attention.",
    fair: () =>
      "Sort findings by severity first, then work top-down. Fix effort should follow impact, not discovery order.",
    poor: () =>
      "Focus on critical and warning-severity findings first next attempt; info-severity findings can usually wait.",
  },
};

const OVERALL_PASS_COMMENT = {
  "bid-elevator":
    "Most of your bids fit the evidence. Review the few outliers before you raise spend.",
  "str-triage":
    "You made clear calls on the search terms. Review the misses before you repeat this with a live report.",
  "campaign-builder":
    "Your campaign structure gives the main targeting jobs a clear home. Review the weak spots before launch.",
  "listing-audit":
    "You found the listing issues that matter most. Review the remaining misses before making the changes.",
  "keyword-research":
    "Your intent calls are mostly clear. Review the terms that could send spend to the wrong audience.",
};

const OVERALL_FAIL_COMMENT = {
  "bid-elevator":
    "Start with the dimensions marked fair or poor. Recheck the evidence, then run the scenario again.",
  "str-triage":
    "Start with relevance and profitability. Review the misses, then run the scenario again.",
  "campaign-builder":
    "Start with campaign roles and budget. Fix the structure, then run the scenario again.",
  "listing-audit":
    "Start with the highest-impact listing issues. Review the evidence, then run the audit again.",
  "keyword-research":
    "Start with search intent and obvious negatives. Review the misses, then run the research again.",
};

const REMEDIATION_LINKS: Record<FeedbackVerdict, readonly string[]> = {
  excellent: [],
  good: [],
  fair: ["/courses", "/dashboard"],
  poor: ["/courses", "/dashboard", "/tools"],
};

const PASSING_REMEDIATION_LINKS: readonly string[] = ["/courses", "/dashboard"];

// ── Factory ─────────────────────────────────────────────────────────────

/**
 * Compose actionable feedback for a graded SimulatorAttempt.
 *
 * Pure function - no side effects.
 *
 * @param params.attempt - graded SimulatorAttempt (must have score, scoreDimensions, status === "graded")
 * @param params.policy - ScorePolicy used to grade this attempt
 */
export function composeAttemptFeedback(params: ComposeAttemptFeedbackParams): AttemptFeedback {
  const { attempt, policy } = params;

  // The caller (use case) is responsible for ensuring status === "graded"
  const score = attempt.score ?? 0;
  const scoreDimensions: ScoreDimensions = attempt.scoreDimensions ?? {};
  const passed = policyIsPassed(score, policy);

  // Per-dimension feedback
  const dimensionFeedback: DimensionFeedback[] = [];
  for (const [dimension, rawScore] of Object.entries(scoreDimensions)) {
    if (rawScore === undefined) continue;
    const verdict = getVerdict(rawScore);

    const comment = DIMENSION_COMMENTS[dimension]?.[verdict];
    const recommendation = DIMENSION_RECOMMENDATIONS[dimension]?.[verdict];

    dimensionFeedback.push({
      dimension,
      verdict,
      score: rawScore,
      comment: comment?.(rawScore) ?? `Score of ${rawScore} on ${dimension}.`,
      recommendation:
        recommendation?.(rawScore) ??
        `Review your approach to ${dimension} and practice with simpler scenarios.`,
    });
  }

  // Overall comment
  const simulatorComments = passed ? OVERALL_PASS_COMMENT : OVERALL_FAIL_COMMENT;
  const overallComment =
    simulatorComments[attempt.simulatorId as SimulatorId] ??
    (passed
      ? "Great work! Review your feedback and try the next scenario."
      : "Review the feedback below and try again. Consistent practice builds mastery.");

  // Remediation links: show links when passed (encourage next step) or when
  // there are poor dimensions (point to learning resources)
  const weakestVerdict = dimensionFeedback.reduce<FeedbackVerdict>((worst, dim) => {
    const order: FeedbackVerdict[] = ["excellent", "good", "fair", "poor"];
    return order.indexOf(dim.verdict) > order.indexOf(worst) ? dim.verdict : worst;
  }, "excellent");

  const remediationLinks = passed
    ? PASSING_REMEDIATION_LINKS
    : weakestVerdict === "poor"
      ? (REMEDIATION_LINKS[weakestVerdict] ?? [])
      : [];

  return {
    attemptId: attempt.id,
    userId: attempt.userId,
    simulatorId: attempt.simulatorId as SimulatorId,
    scenarioId: attempt.scenarioId,
    difficulty: attempt.difficulty,
    mode: attempt.mode,
    overallScore: score,
    passed,
    overallComment,
    remediationLinks,
    dimensionFeedback,
    completedAt: new Date(),
  };
}

// ── Hydration (repository adapter only) ─────────────────────────────────

/**
 * Rehydrate an AttemptFeedback from persisted plain data.
 * Repository adapters only — skips factory validation.
 */
export function hydrateAttemptFeedback(
  plain: Omit<AttemptFeedback, "completedAt"> & {
    completedAt: Date;
  },
): AttemptFeedback {
  return { ...plain };
}
