/**
 * StrTriageInput — input types for the STR Triage simulator.
 *
 * STORY-067: STR Triage Rebuild (Scoring Engine Integration).
 * STORY-082: Expand STR Triage classifier. Replaces the hardcoded
 * `avgSpendPerKeyword = 25` constant and the 4-field KeywordPerfRow with
 * the economics of one expected conversion, zero-order statistical
 * thresholds, existing-target detection, negative-precision rules, and
 * per-brand-class target ROAS routing. See docs/stories/STORY-082.md.
 */

import type { TriageAction } from "./StrTriageOutput";

export type MatchType = "exact" | "phrase" | "broad";
export type CampaignRole = "research" | "performance" | "defense";
export type TargetState = "enabled" | "paused" | "archived";
export type BrandClass = "ownBrand" | "competitorBrand" | "generic";

/** A currently-live target, used to avoid duplicate harvests and to detect wrong-lane placement. */
export interface ExistingTarget {
  readonly text: string;
  readonly normalizedText: string;
  readonly matchType: MatchType;
  readonly campaignId: string;
  readonly adGroupId: string;
  readonly campaignRole: CampaignRole;
  readonly state: TargetState;
}

export interface SearchTermRow {
  readonly searchTerm: string;
  readonly impressions: number;
  readonly clicks: number;
  readonly spend: number;
  readonly orders: number;
  readonly sales: number;
  readonly elapsedDays: number;
  readonly sourceCampaignId: string;
  readonly sourceAdGroupId: string;
  readonly sourceTarget: string;
  readonly sourceMatchType: MatchType;
}

export interface StrTriageInput {
  readonly rows: readonly SearchTermRow[];
  readonly averageOrderValue: number;
  readonly expectedCtrPct: number;
  readonly expectedCvrPct: number;
  /** Per-brand-class target ROAS -- own-brand, competitor, and generic lanes are graded differently. */
  readonly brandTargetRoas: number;
  readonly genericTargetRoas: number;
  readonly competitorTargetRoas: number;
  /** Confidence level (0-1) for the zero-order statistical threshold. Default 0.8. */
  readonly confidenceLevel: number;
  /** Minimum elapsed days before any confident decision. Default 7. */
  readonly minElapsedDays: number;
  /** Minimum orders to call a term a winner. Default 2 (competitor terms require >= 3 regardless). */
  readonly minOrdersForWinner: number;
  readonly brandLexicon: readonly string[];
  readonly competitorBrandLexicon: readonly string[];
  /** Phrases that should always be excluded (negative-phrase) wherever they appear, e.g. an incompatible size/material. */
  readonly incompatibleAttributeLexicon?: readonly string[];
  readonly existingTargets: readonly ExistingTarget[];
  /** The campaign role these rows' search-term report was pulled from. */
  readonly sourceCampaignRole: CampaignRole;
  /**
   * User's submitted classifications — keyed by searchTerm.
   * When provided, the simulator computes per-dimension scores.
   * When absent, returns ground truth only (preview mode).
   */
  readonly userClassifications?: Readonly<Record<string, TriageAction>>;
}
