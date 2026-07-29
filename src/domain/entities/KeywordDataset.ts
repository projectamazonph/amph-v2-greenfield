/**
 * KeywordDataset — a versioned, reproducible set of labeled keywords for one
 * (category, niche) pair, used by the Keyword Research simulator and (per
 * STORY-081) shared with Campaign Builder once that simulator consumes it.
 *
 * STORY-081: Replace hardcoded keyword volumes with versioned scenario
 * datasets. See docs/stories/STORY-081.md for the full decision record.
 *
 * Source hierarchy (docs/stories/STORY-081.md):
 *  1. curated_export   — normalized/anonymized/rescaled from a real,
 *     user-owned export (Helium 10, Data Dive, Brand Analytics, Search
 *     Query Performance, or similar).
 *  2. synthetic_calibrated — deterministic synthetic data used when no
 *     owned export exists yet. Practice-mode only: rejected from
 *     credential/leaderboard scoring (enforced by the app-layer action,
 *     not this entity — see src/app/tools/keyword-research/actions.ts).
 *
 * Live external data must never become the assessment ground truth: it
 * drifts over time and destroys reproducibility. Pure domain — no IO.
 */

import { Result } from "@/domain/shared/Result";

// ── Types ────────────────────────────────────────────────────────────────

/**
 * Search-intent taxonomy for a keyword within its niche (STORY-081, final
 * decision pass). "irrelevant" is the sole ground truth for negative-keyword
 * identification — see KeywordResearchSimulator.
 */
export type KeywordIntent =
  "core" | "feature" | "problem" | "useCase" | "competitor" | "ownBrand" | "irrelevant";

export type KeywordBrandClass = "generic" | "ownBrand" | "competitorBrand";

export type KeywordDatasetSourceType = "curated_export" | "synthetic_calibrated";

export interface KeywordDatasetKeyword {
  readonly term: string;
  readonly normalizedTerm: string;
  readonly monthlySearchVolume: number;
  readonly competitionIndex: number;
  readonly suggestedBidLow: number;
  readonly suggestedBidMedian: number;
  readonly suggestedBidHigh: number;
  readonly relevanceScore: number;
  readonly intent: KeywordIntent;
  readonly brandClass: KeywordBrandClass;
  readonly seasonalityIndex: number;
  readonly sourceConfidence: number;
}

export interface KeywordDataset {
  readonly datasetId: string;
  readonly version: string;
  readonly marketplace: string;
  readonly currencyCode: string;
  readonly categoryId: string;
  readonly nicheId: string;
  readonly sourceType: KeywordDatasetSourceType;
  readonly generatedAt: string;
  readonly keywords: readonly KeywordDatasetKeyword[];
}

export type KeywordDatasetError =
  { kind: "empty_keywords" } | { kind: "invalid_field"; field: string };

// ── Factory ──────────────────────────────────────────────────────────────

export interface CreateKeywordDatasetParams {
  readonly datasetId: string;
  readonly version: string;
  readonly marketplace: string;
  readonly currencyCode: string;
  readonly categoryId: string;
  readonly nicheId: string;
  readonly sourceType: KeywordDatasetSourceType;
  readonly generatedAt: string;
  readonly keywords: readonly KeywordDatasetKeyword[];
}

/**
 * Validate and construct a KeywordDataset. Does not validate individual
 * keyword rows beyond non-emptiness — row-level authoring correctness is a
 * content-quality concern, not a structural one.
 */
export function createKeywordDataset(
  params: CreateKeywordDatasetParams,
): Result<KeywordDataset, KeywordDatasetError> {
  if (params.datasetId.trim().length === 0) {
    return Result.err({ kind: "invalid_field", field: "datasetId" });
  }
  if (params.version.trim().length === 0) {
    return Result.err({ kind: "invalid_field", field: "version" });
  }
  if (params.nicheId.trim().length === 0) {
    return Result.err({ kind: "invalid_field", field: "nicheId" });
  }
  if (params.keywords.length === 0) {
    return Result.err({ kind: "empty_keywords" });
  }

  return Result.ok({
    datasetId: params.datasetId,
    version: params.version,
    marketplace: params.marketplace,
    currencyCode: params.currencyCode,
    categoryId: params.categoryId,
    nicheId: params.nicheId,
    sourceType: params.sourceType,
    generatedAt: params.generatedAt,
    keywords: params.keywords,
  });
}
