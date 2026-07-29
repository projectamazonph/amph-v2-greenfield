import { describe, it, expect } from "vitest";
import { createKeywordDataset, type KeywordDatasetKeyword } from "../KeywordDataset";

const KEYWORD: KeywordDatasetKeyword = {
  term: "bamboo cutting board",
  normalizedTerm: "bamboo cutting board",
  monthlySearchVolume: 4000,
  competitionIndex: 0.6,
  suggestedBidLow: 0.4,
  suggestedBidMedian: 0.7,
  suggestedBidHigh: 1.1,
  relevanceScore: 0.95,
  intent: "core",
  brandClass: "generic",
  seasonalityIndex: 1.0,
  sourceConfidence: 0.8,
};

function baseParams(overrides: Partial<Parameters<typeof createKeywordDataset>[0]> = {}) {
  return {
    datasetId: "kwds-bamboo-cutting-board",
    version: "2026-07-29-v1",
    marketplace: "US",
    currencyCode: "USD",
    categoryId: "general_home",
    nicheId: "bamboo-cutting-board",
    sourceType: "synthetic_calibrated" as const,
    generatedAt: "2026-07-29T00:00:00.000Z",
    keywords: [KEYWORD],
    ...overrides,
  };
}

describe("createKeywordDataset", () => {
  it("creates a valid dataset", () => {
    const result = createKeywordDataset(baseParams());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.keywords).toHaveLength(1);
    expect(result.value.sourceType).toBe("synthetic_calibrated");
  });

  it("rejects an empty keywords array", () => {
    const result = createKeywordDataset(baseParams({ keywords: [] }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("empty_keywords");
  });

  it("rejects an empty datasetId", () => {
    const result = createKeywordDataset(baseParams({ datasetId: "  " }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_field", field: "datasetId" });
  });

  it("rejects an empty version", () => {
    const result = createKeywordDataset(baseParams({ version: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_field", field: "version" });
  });

  it("rejects an empty nicheId", () => {
    const result = createKeywordDataset(baseParams({ nicheId: "" }));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toEqual({ kind: "invalid_field", field: "nicheId" });
  });
});
