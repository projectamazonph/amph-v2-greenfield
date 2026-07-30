/**
 * KeywordResearchInput: input types for the Keyword Research simulator.
 *
 * STORY-081: Keyword Research becomes a genuinely separate simulator with
 * its own workflow, scoring, and state — no longer a Listing Audit alias.
 * It shares the versioned KeywordDataset with Campaign Builder, but the
 * dataset lookup happens in the app-layer server action (via
 * KeywordDatasetRepository), not here: this simulator stays a pure
 * function like every sibling simulator (no constructor dependencies, no
 * IO). See docs/stories/STORY-081.md.
 */

import type { KeywordDataset, KeywordIntent } from "@/domain/entities/KeywordDataset";

/** Student's classification of one keyword, keyed by normalizedTerm. */
export interface KeywordUserClassification {
  readonly intent: KeywordIntent;
  /** Whether the student would add this keyword as a negative/exclusion. */
  readonly isNegative: boolean;
}

export interface KeywordResearchInput {
  /** Resolved by the app-layer action from KeywordDatasetRepository. */
  readonly dataset: KeywordDataset;
  /**
   * Student's per-keyword decisions, keyed by normalizedTerm. Undefined =
   * preview/ground-truth-only run (no grading).
   */
  readonly userClassifications?: Readonly<Record<string, KeywordUserClassification>>;
}
