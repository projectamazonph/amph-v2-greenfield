/**
 * ListingAuditInput — input types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 * STORY-080: Listing Audit rubric rewrite. Adds structured imagery data
 * and marketplace so the new rubric can score them. Both are optional
 * with sensible defaults (no images, US marketplace) so existing callers
 * that only audit title/bullets/description keep working unchanged.
 */

import type { FindingAction } from "./ListingAuditOutput";

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
}
