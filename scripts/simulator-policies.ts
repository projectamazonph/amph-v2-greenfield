/**
 * scripts/simulator-policies.ts
 *
 * The canonical ScorePolicy definitions, extracted so that the seed script
 * and its test share one source of truth. The test used to keep a
 * copy-pasted mirror of this list, which silently drifted out of sync the
 * moment the policies changed. Side-effect free: importing this must not
 * touch the environment or the database.
 *
 * STORY-067, STORY-074.
 */

export type PolicyDef = {
  id: string;
  simulatorId: string;
  difficulty: string;
  mode: string;
  /** Dimension name -> weight. Must sum to 1.0; validated below. */
  dimensionConfig: Record<string, number>;
  passingScore: number;
};

export const POLICIES: PolicyDef[] = [
  // Weights are the pre-Sprint-14 relative weights, renormalised after
  // removing `explanation` (a hardcoded 100, pure free marks) and
  // `dataSufficiency`/`reviewCoverage` (completion, not judgement).
  // Every policy sums to exactly 1.0 and is validated through
  // createScorePolicy() below. STORY-071, STORY-072, STORY-074.

  // ── Bid Elevator ──────────────────────────────────────────────────────
  {
    id: "policy-bid-elevator-beginner-practice",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 50,
  },
  {
    id: "policy-bid-elevator-beginner-credential",
    simulatorId: "bid-elevator",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-intermediate-practice",
    simulatorId: "bid-elevator",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-bid-elevator-advanced-practice",
    simulatorId: "bid-elevator",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { bidAccuracy: 0.45, budgetAdherence: 0.33, roasHit: 0.22 },
    passingScore: 80,
  },

  // ── STR Triage ───────────────────────────────────────────────────────
  // `profitability` here is genuinely revenue-based (preserved revenue over
  // non-pausable revenue), so unlike Listing Audit's it keeps its name.
  {
    id: "policy-str-triage-beginner-practice",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { direction: 0.5, profitability: 0.5 },
    passingScore: 70,
  },
  {
    id: "policy-str-triage-beginner-credential",
    simulatorId: "str-triage",
    difficulty: "beginner",
    mode: "credential",
    dimensionConfig: { direction: 0.43, profitability: 0.57 },
    passingScore: 75,
  },
  {
    id: "policy-str-triage-intermediate-practice",
    simulatorId: "str-triage",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { direction: 0.37, profitability: 0.63 },
    passingScore: 72,
  },
  {
    id: "policy-str-triage-advanced-practice",
    simulatorId: "str-triage",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { direction: 0.37, profitability: 0.63 },
    passingScore: 75,
  },

  // ── Campaign Builder ──────────────────────────────────────────────────
  {
    id: "policy-campaign-builder-beginner-practice",
    simulatorId: "campaign-builder",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 50,
  },
  {
    id: "policy-campaign-builder-intermediate-practice",
    simulatorId: "campaign-builder",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 65,
  },
  {
    id: "policy-campaign-builder-advanced-practice",
    simulatorId: "campaign-builder",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { structureQuality: 0.45, budgetAllocation: 0.33, keywordRelevance: 0.22 },
    passingScore: 80,
  },

  // ── Listing Audit ─────────────────────────────────────────────────────
  // `priorityCoverage` was `profitability`, renamed because nothing here
  // models revenue. STORY-073, STORY-076.
  {
    id: "policy-listing-audit-beginner-practice",
    simulatorId: "listing-audit",
    difficulty: "beginner",
    mode: "practice",
    dimensionConfig: { direction: 1.0 },
    passingScore: 70,
  },
  {
    id: "policy-listing-audit-intermediate-practice",
    simulatorId: "listing-audit",
    difficulty: "intermediate",
    mode: "practice",
    dimensionConfig: { direction: 0.7, priorityCoverage: 0.3 },
    passingScore: 72,
  },
  {
    id: "policy-listing-audit-advanced-practice",
    simulatorId: "listing-audit",
    difficulty: "advanced",
    mode: "practice",
    dimensionConfig: { direction: 0.6, priorityCoverage: 0.4 },
    passingScore: 75,
  },
];
