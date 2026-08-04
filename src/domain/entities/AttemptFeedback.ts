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
      `${s}% of your bids landed in the range the data actually supported — no keywords left underfunded, none pushed past what the evidence justified.`,
    good: (s) =>
      `${s}% of your bids were well-calibrated. The rest were probably bid on gut feel rather than the CTR/CVR evidence for that keyword — worth a second look before running this at scale.`,
    fair: (s) =>
      `${s}% of your bids matched what the data supported. Close to half your keywords were mispriced, which in a real account means budget drifting toward the wrong terms.`,
    poor: (s) =>
      `Only ${s}% of your bids matched the evidence. At this error rate, a real campaign would be losing money on overpriced clicks while starving the keywords that actually convert.`,
  },
  // bid-elevator: how much budget was used efficiently before pacing throttled
  budgetAdherence: {
    excellent: (s) =>
      `Your bids kept spend on pace all day (${s}%) — no early budget exhaustion, no wasted headroom sitting unspent.`,
    good: (s) =>
      `${s}% budget adherence. You're close, but a few bids are probably running hot enough to throttle the campaign before the day ends, or low enough to leave spend on the table.`,
    fair: (s) =>
      `${s}% adherence means the daily budget likely ran out early (from overbidding) or under-delivered (from underbidding) — either way, real ad spend not doing its job for part of the day.`,
    poor: (s) =>
      `${s}% adherence is a real budget-management problem — this bid set would blow through the daily cap hours early, or barely spend it at all.`,
  },
  // bid-elevator: hit target ROAS while capturing available sales, without bidding past the profitable ceiling
  roasHit: {
    excellent: () =>
      `You hit the target ROAS while capturing the sales that were actually available — the profitable outcome, not just a passing score.`,
    good: (s) =>
      `Close to target ROAS (${s}%). You're leaving some profitable sales on the table, or shaving margin thinner than the target allows.`,
    fair: (s) =>
      `${s}% of the profitable outcome achieved. This bid set would land meaningfully under target ROAS — the kind of gap a client would ask about.`,
    poor: (s) =>
      `${s}% — this bid set either chases sales past the point where they're profitable, or leaves so much volume uncaptured that ROAS never gets close to target.`,
  },
  // campaign-builder: % match of campaign types + ad group coverage vs. ground truth
  structureQuality: {
    excellent: (s) =>
      `Your campaign structure covers the launch types this niche and budget actually call for (${s}%).`,
    good: (s) =>
      `${s}% structural coverage. You're missing a campaign type a real launch plan for this niche would include — usually the gap between "runs" and "performs."`,
    fair: (s) =>
      `${s}% coverage means real gaps in the structure — likely missing the auto-discovery layer, the brand-defense layer, or both.`,
    poor: (s) =>
      `${s}% structural coverage is thin for this budget and niche. A structure this incomplete would leave real discovery and defense gaps from day one.`,
  },
  // campaign-builder: % of user keywords containing words from the product niche
  keywordRelevance: {
    excellent: (s) =>
      `${s}% of your keywords are clearly on-niche — minimal risk of spend leaking to irrelevant search traffic.`,
    good: (s) =>
      `${s}% relevance. A handful of keywords look like they'd pull in traffic outside what this product actually serves.`,
    fair: (s) =>
      `${s}% relevance means real budget risk — enough off-niche keywords here that spend would leak to searches that don't convert.`,
    poor: (s) =>
      `${s}% relevance is a real problem — this keyword set would spend meaningfully against traffic that has nothing to do with the product.`,
  },
  // campaign-builder: F1 of submitted negatives against the expected routing set (STORY-084)
  negativeRouting: {
    excellent: (s) =>
      `${s}% of your negative-keyword routing matches how this structure actually needs to be protected — Auto isn't cannibalizing Manual's winners, and match types aren't competing against themselves.`,
    good: (s) =>
      `${s}% routing accuracy. A negative or two is missing — likely Auto quietly bidding against a keyword Manual already owns, which is wasted spend hiding in plain sight.`,
    fair: (s) =>
      `${s}% routing accuracy means real internal cannibalization — campaigns are bidding against each other for the same searches instead of each doing its own job.`,
    poor: (s) =>
      `${s}% — with almost no negative routing in place, this structure would bid against itself constantly, inflating CPCs on your own best keywords.`,
  },
  // campaign-builder: budget reconciliation (STORY-084)
  budgetAllocation: {
    excellent: (s) =>
      `Your budget reconciles cleanly (${s}%) — the total matches what was actually approved, and each campaign role is funded close to how a launch this size should allocate spend.`,
    good: (s) =>
      `${s}% budget accuracy. Either the total is slightly off from what was approved, or one campaign role is funded meaningfully more or less than its job calls for.`,
    fair: (s) =>
      `${s}% accuracy is a real reconciliation problem — this is the kind of budget gap that shows up in a monthly spend report and needs explaining.`,
    poor: (s) =>
      `${s}% — the budget here doesn't reconcile against what was approved, and the per-role split would leave some campaigns starved while others overspend with nothing left to optimize.`,
  },
  // campaign-builder: % of keywords correctly kept out of/confined to branded traffic (STORY-084)
  brandedIsolation: {
    excellent: (s) =>
      `${s}% branded-traffic isolation — your own brand terms stay in Defense, and nothing here is quietly bidding on a competitor's name.`,
    good: (s) =>
      `${s}% isolation. A branded or competitor term has leaked into the wrong campaign, which either wastes spend on traffic you already own or opens a fight you didn't mean to start.`,
    fair: (s) =>
      `${s}% isolation is a real problem — branded search traffic is landing outside Defense, or competitor terms are running without the containment they need.`,
    poor: (s) =>
      `${s}% — branded and competitor traffic isn't isolated at all here, which in a real account means spend leaking into searches this structure was never meant to touch.`,
  },
  // campaign-builder: % of keyword targets that aren't duplicated across ad groups (STORY-084)
  duplicateControl: {
    excellent: (s) =>
      `${s}% duplicate-free — no keyword is quietly competing against itself across two ad groups, so every dollar of bid pressure goes to one clear target.`,
    good: (s) =>
      `${s}% duplicate control. A keyword or two is targeted in more than one ad group, which means you're bidding against yourself for that search instead of Amazon's other advertisers.`,
    fair: (s) =>
      `${s}% duplicate control means real self-cannibalization — multiple ad groups are competing for the same auction, driving your own CPC up for no reason.`,
    poor: (s) =>
      `${s}% — with this much duplication, a meaningful share of your budget would go toward outbidding your own ad groups instead of winning new customers.`,
  },
  // campaign-builder: % of campaigns matching the house naming convention (STORY-084)
  namingCompliance: {
    excellent: (s) =>
      `${s}% naming compliance — every campaign follows the house convention, so anyone on the team can tell what it does and how it's funded just from the name.`,
    good: (s) =>
      `${s}% compliance. Most names follow the convention; the rest would slow down anyone auditing this account later.`,
    fair: (s) =>
      `${s}% compliance is a real gap — enough campaigns are off-convention that a teammate skimming the account couldn't reliably tell strategy from label.`,
    poor: (s) =>
      `${s}% — naming here wouldn't hold up in a real account. A well-named campaign structure that's strategically broken is still broken, but a broken naming convention is its own maintenance cost.`,
  },
  // keyword-research: correctly classifying keyword intent
  intentAccuracy: {
    excellent: (s) =>
      `${s}% correct intent calls — the foundation this niche's targeting strategy would actually be built on.`,
    good: (s) =>
      `${s}% accuracy. A few keywords are probably filed under the wrong intent bucket, which would nudge match-type and campaign-role decisions downstream.`,
    fair: (s) =>
      `${s}% correct is a real gap — misclassified intent here would send keywords into the wrong campaign role (defense vs. discovery vs. performance).`,
    poor: (s) =>
      `${s}% correct intent classification would misroute a meaningful share of this keyword list before any campaign is even built.`,
  },
  // keyword-research: flagging keywords that should be excluded
  negativeIdentification: {
    excellent: (s) =>
      `You correctly flagged ${s}% of the keywords that don't belong in this campaign — that's spend that never gets wasted.`,
    good: (s) =>
      `${s}% of true negatives caught. The ones you missed would slip into a campaign and quietly draw clicks that were never going to convert.`,
    fair: (s) =>
      `${s}% catch rate on negatives — real spend leakage here, keywords that should've been excluded but weren't.`,
    poor: (s) =>
      `${s}% — most of the keywords that needed to be flagged as negative got through, which in a live campaign means ongoing wasted spend until someone catches it manually.`,
  },
  // str-triage: % terms correctly classified; listing-audit: % findings correctly triaged fix/skip
  direction: {
    excellent: (s) =>
      `${s}% correct calls — the kind of consistency that compounds into real account performance over time.`,
    good: (s) =>
      `${s}% correct. The misses here are the quiet kind: a decision left standing that should have changed, or vice versa.`,
    fair: (s) =>
      `${s}% correct is a real gap — in a live account, this error rate means decisions a manager would have to catch and reverse later.`,
    poor: (s) =>
      `${s}% correct is below what a coin flip would get on a well-structured decision set — worth rebuilding the fundamentals before this runs on a real account.`,
  },
  // str-triage: % of non-removal-ground-truth revenue preserved by classification choices
  profitability: {
    excellent: (s) =>
      `Your classification choices preserved ${s}% of the revenue that should have stayed in the campaign — no winning terms wrongly cut.`,
    good: (s) =>
      `${s}% of revenue preserved. Somewhere in here a term that was actually earning its keep probably got paused or negated.`,
    fair: (s) =>
      `${s}% revenue preservation means real sales left on the table — terms that were working got treated like losers.`,
    poor: (s) =>
      `${s}% — this decision set would cut a meaningful share of revenue-generating terms, the opposite of what triage is supposed to protect.`,
  },
  // listing-audit: severity-weighted F1 of the student's fix decisions
  priorityCoverage: {
    excellent: (s) =>
      `You fixed what actually mattered (${s}%) without wasting effort on issues that weren't worth touching.`,
    good: (s) =>
      `${s}%. You caught most of the priority issues, but probably spent some effort on low-severity findings while a higher-priority one went untouched.`,
    fair: (s) =>
      `${s}% priority coverage — the fix effort here isn't matched to what actually moves the listing's performance.`,
    poor: (s) =>
      `${s}% — this triage would spend fix effort on the wrong findings, leaving the issues that actually hurt conversion and compliance unaddressed.`,
  },
};

const DIMENSION_RECOMMENDATIONS: Record<string, Record<FeedbackVerdict, DimensionCopyFn>> = {
  bidAccuracy: {
    excellent: () =>
      "Try a scenario with tighter evidence windows to test your calibration under more uncertainty.",
    good: () =>
      "Before bidding, check each keyword's evidence count — low-evidence terms deserve more caution.",
    fair: () =>
      "Compare your bid to the benchmark CPC and the keyword's CTR/CVR before adjusting — don't bid on intuition alone.",
    poor: () =>
      "Start smaller: bid one keyword at a time and check it against the evidence before moving to the next.",
  },
  budgetAdherence: {
    excellent: () =>
      "Move to a scenario with a tighter daily budget to test your pacing discipline.",
    good: () =>
      "Add up your projected spend across all keywords before submitting — check it against the daily cap.",
    fair: () =>
      "Calculate estimated daily spend per keyword (bid × available impressions × CTR) and total it before submitting.",
    poor: () =>
      "Practice budget math on paper first: bid × impressions × CTR, summed across every keyword, must fit the daily cap.",
  },
  roasHit: {
    excellent: () =>
      "Try a scenario with a higher target ROAS to test your bidding discipline under a tighter margin.",
    good: () =>
      "Check each bid against its economic ceiling — the highest bid that stays profitable — before finalizing.",
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
      "Build your keyword list starting from the niche's own words, then expand outward — not the reverse.",
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
      "Before finalizing keywords, check each one against the brand's own names, aliases, and misspellings — and keep those confined to Defense.",
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
      "Focus specifically on negatives next attempt — go through the list looking only for terms that don't belong.",
  },
  direction: {
    excellent: () =>
      "Try a scenario with more ambiguous or borderline cases to keep sharpening your judgment.",
    good: () =>
      "For each borderline case, write down the specific evidence that tipped your decision before committing to it.",
    fair: () =>
      "Slow down on cases you're unsure about — check the underlying numbers again before deciding.",
    poor: () =>
      "Start with the most clear-cut cases first to rebuild the fundamentals before tackling the ambiguous ones.",
  },
  profitability: {
    excellent: () =>
      "Try a scenario with tighter target ROAS thresholds to test your judgment under less margin for error.",
    good: () =>
      "Double-check the ROAS on any term you're about to pause or negate — a losing-looking term can still be a real winner.",
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
      "Sort findings by severity first, then work top-down — fix effort should follow impact, not order of discovery.",
    poor: () =>
      "Focus on critical and warning-severity findings first next attempt; info-severity findings can usually wait.",
  },
};

const OVERALL_PASS_COMMENT = {
  "bid-elevator":
    "Impressive work. Your bid strategy shows a strong grasp of PPC fundamentals. Ready for more advanced scenarios.",
  "str-triage":
    "Excellent prioritization. Your triage decisions demonstrate solid campaign management instincts.",
  "campaign-builder":
    "Well-structured campaign build. Your keyword and match-type selections show good strategic thinking.",
  "listing-audit":
    "Sharp audit skills. Your identification of listing issues and opportunities is spot-on.",
  "keyword-research":
    "Strong keyword instincts. Your intent classifications and negative-keyword calls show a good read on the niche.",
};

const OVERALL_FAIL_COMMENT = {
  "bid-elevator":
    "Good effort. Review the bid fundamentals and try again. Focus on the dimensions marked fair or poor.",
  "str-triage":
    "Review the triage priorities and try again. Consistent prioritization improves with practice.",
  "campaign-builder":
    "Review the campaign-building principles and refine your structure. Each revision builds intuition.",
  "listing-audit":
    "Audit skills improve with practice. Review the key listing factors and try again with a sharper eye.",
  "keyword-research":
    "Keyword judgment improves with practice. Review the intent taxonomy and look again at which terms don't fit the niche.",
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
