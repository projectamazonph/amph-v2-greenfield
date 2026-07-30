# STORY-081: Replace hardcoded keyword volumes with versioned scenario datasets

## Status

**✅ Done — merged in PR #246.** Ryan's third and authoritative
decision pass (2026-07-29). **Supersedes** the two earlier passes (PRs
#241/#242) — the dataset schema, intent taxonomy, and launch coverage
target all changed (12 niches × ~150-250 keywords each, not 10 × unlisted
count).

**Scope note:** the engineering half (domain simulator, repository,
registry, app layer) is done. Only 4 of the 12 launch niches are
curated so far (~18 keywords each, not 150-250), and every dataset is
`synthetic_calibrated` rather than a real seller export — the remaining
content-authoring work is tracked as follow-up (STORY-081b/c), not
silently deferred. See "Suggested split" below for the original scope
breakdown.

## Current mechanism (verbatim, `ListingAuditSimulator.ts:generateKeywords`)

Hardcoded string templates + hardcoded volume/competition constants,
identical shape for every niche, including `near me` (non-transferable
local-search intent).

## Decisions (final)

### Source: layered, reproducible

1. User-owned exports (Helium 10, Data Dive, Brand Analytics, Search
   Query Performance, or similar).
2. Normalize, anonymize, and rescale those datasets for training use.
3. Deterministic synthetic datasets calibrated against the real
   distributions when owned data is unavailable.

Live external data must never become the assessment ground truth — it
changes over time and destroys reproducibility. Remove generic
local-search patterns (`near me`) unless a specific scenario genuinely
requires them.

### Dataset structure

Keyed by **both** category and niche:

```ts
type KeywordDataset = {
  datasetId: string;
  version: string;
  marketplace: string;
  currencyCode: string;
  categoryId: string;
  nicheId: string;
  sourceType: "curated_export" | "synthetic_calibrated"; // adapt to actual naming at implementation time
  generatedAt: string;
  keywords: Array<{
    term: string;
    normalizedTerm: string;
    monthlySearchVolume: number;
    competitionIndex: number;
    suggestedBidLow: number;
    suggestedBidMedian: number;
    suggestedBidHigh: number;
    relevanceScore: number;
    intent: "core" | "feature" | "problem" | "useCase" | "competitor" | "ownBrand" | "irrelevant";
    brandClass: "generic" | "ownBrand" | "competitorBrand";
    seasonalityIndex: number;
    sourceConfidence: number;
  }>;
};
```

### Keyword Research: a genuinely separate simulator

Own learning objective, workflow, scoring, state, and analytics — its
own registry entry, not a Listing Audit alias. It shares the same
versioned keyword-data service with **Campaign Builder**. Shared data
does not mean shared simulator logic.

### Versioning (required)

```ts
keywordDatasetId: string;
keywordDatasetVersion: string;
```

Updating the dataset creates a new version; existing scenario attempts
keep using their original snapshot.

### Launch coverage

**12 curated niches across at least 4 category archetypes**, ~150-250
labeled keywords per niche. Uncurated niches may use a seeded
category-level distribution plus a niche-specific lexicon — marked
synthetic, practice-mode only. **Formal assessments and leaderboard
scores use curated datasets only.**

## Suggested split

- **STORY-081a:** Dataset type + loader + fallback-sandbox behavior +
  the curated/practice-mode gate.
- **STORY-081b:** Curate and author the 12 launch niches at 150-250
  keywords each — content work; consider a template + review workflow
  rather than hand-authoring every row.
- **STORY-081c:** Split Keyword Research into its own registry entry,
  sharing the dataset service with Campaign Builder.
- **STORY-081d:** Version-tie datasets to scenarios/attempts.

## Acceptance criteria

- [ ] `KeywordDataset` type + loader implemented per the schema above
- [ ] `near me` and other non-transferable local-intent templates removed
- [ ] 12 curated niches authored across ≥4 category archetypes, 150-250
      keywords each
- [ ] Uncurated/fallback datasets are clearly labeled synthetic,
      practice-mode only, and **rejected from credential/leaderboard
      scoring**
- [ ] Keyword Research is a separate registry entry with its own
      workflow/scoring/state, sharing the dataset service with Campaign
      Builder
- [ ] Attempts persist `keywordDatasetId`/`keywordDatasetVersion`
- [ ] Deterministic-replay test: same scenario + dataset version → identical
      rows
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
