/**
 * KeywordResearchInput — input shape for the Keyword Research simulator.
 *
 * Student is given a seed term + product, researches and prioritizes
 * keywords (with relevance score, search volume proxy, competition proxy).
 */

export type KeywordPriority = "PRIMARY" | "SECONDARY" | "NEGATIVE";

export interface KeywordCandidate {
  readonly text: string;
  readonly relevance: number; // 0-1, how well it matches the product
  readonly searchVolumeProxy: number; // 0-1, normalized "popularity"
  readonly competitionProxy: number; // 0-1, normalized "competition" — 0 = low, 1 = high
}

export interface KeywordResearchInput {
  readonly scenarioId: string;
  readonly seedTerm: string;
  readonly product: {
    readonly asin: string;
    readonly name: string;
    readonly category: string;
    readonly aov: number;
    readonly targetAcos: number;
  };
  readonly candidates: KeywordCandidate[];
  readonly userDecisions: Array<{
    readonly keyword: string;
    readonly priority: KeywordPriority;
    readonly notes?: string;
  }>;
  readonly negatives: string[];
}
