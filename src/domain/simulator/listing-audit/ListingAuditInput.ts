/**
 * ListingAuditInput — input types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 * STORY-070: Listing Audit Rebuild (Scoring Engine Integration).
 */

import type { FindingAction } from "./ListingAuditOutput";

export interface ListingAuditInput {
  readonly title: string;
  readonly bullets: readonly string[];
  readonly description: string;
  readonly category: string;
  readonly niche: string;
  /**
   * Student's submitted fix/skip decisions — keyed by finding id.
   * When provided, the simulator computes per-dimension scores.
   * When absent, returns ground truth only (preview mode).
   */
  readonly userFindingActions?: Readonly<Record<string, FindingAction>>;
}
