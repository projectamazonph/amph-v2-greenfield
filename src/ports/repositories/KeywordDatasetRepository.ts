/**
 * KeywordDatasetRepository — port for resolving a niche to its versioned
 * KeywordDataset.
 *
 * STORY-081. Deliberately not injected into KeywordResearchSimulator's
 * constructor: the simulator stays a pure function like every sibling
 * simulator, so the dataset lookup happens here, in the app-layer server
 * action, before the resolved dataset is passed in as plain input.
 *
 * `findByNiche` always resolves — an uncurated niche falls back to a
 * deterministic synthetic dataset (see StaticKeywordDatasetRepository)
 * rather than erroring, per docs/stories/STORY-081.md: "Uncurated niches
 * may use a seeded category-level distribution plus a niche-specific
 * lexicon — marked synthetic, practice-mode only."
 */

import type { Result } from "@/domain/shared/Result";
import type { KeywordDataset } from "@/domain/entities/KeywordDataset";

export type KeywordDatasetRepositoryError = { kind: "invalid_niche" };

export interface KeywordDatasetRepository {
  /**
   * Resolve the current version of a niche's KeywordDataset. Curated niches
   * return their authored dataset (sourceType "curated_export" once real
   * seller-export data has been ingested; "synthetic_calibrated" today —
   * see StaticKeywordDatasetRepository). Any other niche string resolves to
   * a deterministic synthetic fallback, keyed by the normalized niche id.
   */
  findByNiche(nicheId: string): Promise<Result<KeywordDataset, KeywordDatasetRepositoryError>>;
}
