/**
 * ListingAuditInput — input types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-080: Listing Audit rubric rewrite. Adds structured imagery data
 * and marketplace so the new rubric can score them. Both are optional
 * with sensible defaults (no images, US marketplace) so existing callers
 * that only audit title/bullets/description keep working unchanged.
 * STORY-083: adds the remaining `ListingScenarioContext` fields (see
 * ListingAuditOutput.ts) the ground-truth resolver needs to tell a real
 * issue from a context-disproven false positive. Same "optional, defaults
 * to empty" treatment as STORY-080's fields.
 */

import type { FindingAction } from "./ListingAuditOutput";
import type { Difficulty } from "@/domain/entities/SimulatorScenario";

export type ImageRole =
  "main" | "lifestyle" | "infographic" | "dimensions" | "comparison" | "packaging" | "other";

export interface ListingImage {
  readonly slot: number;
  readonly role: ImageRole;
  readonly whiteBackground: boolean;
  readonly hasTextOverlay: boolean;
  /** Approximate % of the frame the product occupies, 0-100. */
  readonly productFillPct: number;
}

export interface ListingAuditInput {
  readonly title: string;
  readonly bullets: readonly string[];
  readonly description: string;
  readonly category: string;
  readonly niche: string;
  /** Defaults to "US" -- the only marketplace with a verified title-length policy today. */
  readonly marketplace?: string;
  /** Defaults to []. */
  readonly images?: readonly ListingImage[];
  readonly hasVideo?: boolean;
  readonly hasAPlus?: boolean;
  /**
   * Student's submitted fix/skip decisions — keyed by finding id.
   * When provided, the simulator computes per-dimension scores.
   * When absent, returns ground truth only (preview mode).
   */
  readonly userFindingActions?: Readonly<Record<string, FindingAction>>;

  // ── STORY-083: ground-truth resolver context, all optional/defaulted ────
  /** Defaults to `category` normalized -- pass explicitly once category ids diverge from the free-text `category` field. */
  readonly categoryId?: string;
  readonly productType?: string;
  /** Defaults to {}. e.g. `{ material: "bamboo", dimensions: "18 x 12 x 1 in" }`. */
  readonly structuredAttributes?: Readonly<Record<string, string>>;
  readonly variationTheme?: string;
  /** Defaults to "". What the shopper is trying to accomplish. */
  readonly primaryCustomerIntent?: string;
  /** Defaults to []. */
  readonly primaryKeywords?: readonly string[];
  readonly listingStrategy?: string;
  /** Defaults to {}. */
  readonly currentPerformance?: Readonly<Record<string, unknown>>;
  /** Defaults to {}. Keyed by ruleId -- see ListingScenarioContext.complianceEvidence. */
  readonly complianceEvidence?: Readonly<Record<string, string>>;

  // STORY-080: difficulty-scaled finding volume/severity mix
  /** Defaults to "intermediate". Used to scale the number and severity mix of findings. */
  readonly difficulty?: Difficulty;
}
