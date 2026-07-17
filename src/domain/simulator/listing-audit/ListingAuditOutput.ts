/**
 * ListingAuditOutput — output types for the Listing Audit + Keyword Research simulator.
 *
 * STORY-040: Listing Audit + Keyword Research simulator.
 */

export type AuditCategory = "title" | "bullets" | "description" | "backend";
export type FindingSeverity = "info" | "warning" | "critical";

export interface AuditFinding {
  readonly category: AuditCategory;
  readonly severity: FindingSeverity;
  readonly message: string;
  readonly suggestion: string;
}

export interface ListingAudit {
  readonly titleScore: number; // 0–100
  readonly bulletScore: number; // 0–100
  readonly descriptionScore: number; // 0–100
  readonly overallScore: number; // 0–100
  readonly findings: readonly AuditFinding[];
}

export interface KeywordResult {
  readonly keyword: string;
  readonly searchVolumeEstimate: number; // monthly search volume proxy
  readonly competition: "low" | "medium" | "high";
  readonly priority: "high" | "medium" | "low";
}

export interface KeywordResearchResult {
  readonly keywords: readonly KeywordResult[];
  readonly searchVolumeEstimate: number;
}

export interface ListingAuditOutput {
  readonly audit: ListingAudit;
  readonly keywordResearch: KeywordResearchResult;
  /** Overall score 0–100 */
  readonly score: number;
}
