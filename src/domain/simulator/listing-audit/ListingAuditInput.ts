/**
 * ListingAuditInput — input types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 */

export interface ListingAuditInput {
  readonly title: string;
  readonly bullets: readonly string[];
  readonly description: string;
  readonly category: string;
  readonly niche: string;
}
