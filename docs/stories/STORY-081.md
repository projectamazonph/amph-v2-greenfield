# STORY-081: Replace hardcoded keyword volumes with versioned scenario datasets

## Status

**Decided.** Ryan's decisions recorded below (2026-07-29). See
`docs/simulator-remediation-decisions.md` for cross-cutting rules.

**Scope note:** curating 10 real datasets across 5 categories plus
splitting out a new registry entry is content-authoring work as much as
engineering work. Recommend splitting; see "Suggested split" below.

## Current mechanism (verbatim, `ListingAuditSimulator.ts:generateKeywords`)

```ts
const templates: Array<[string, number, KeywordResult["competition"]]> = [
  [`${lower}`, 5000, "high"],
  [`${lower} buy online`, 2000, "medium"],
  // ... hardcoded string templates + hardcoded volume/competition constants
];
```

Identical shape for every niche; includes `near me` (local-search intent
that doesn't transfer to Amazon retail).

## Decisions

### 1. Hybrid data source

Primary: curated, anonymized exports from real research workflows
(competitor-export-style, seed-export-style, search-term reports,
brand-analytics-style query data). Do not reproduce proprietary column
names or imply synthetic data came directly from Amazon unless it did.

Secondary: synthetic-but-realistic datasets authored from category
distributions, explicitly labeled:

```ts
dataOrigin: "curated_anonymized" | "synthetic_calibrated";
```

Never present hardcoded search volume as real live Amazon volume.

### 2. Dataset shape

Keyed by `category + niche + marketplace + version`
(e.g. `home-kitchen/drawer-organizers/US/v1.0.0`):

```ts
type KeywordDataset = {
  id: string;
  version: string;
  category: string;
  niche: string;
  marketplace: string;
  currency: string;
  dataOrigin: "curated_anonymized" | "synthetic_calibrated";
  generatedAt?: string;
  product: {
    brand: string;
    title: string;
    asin?: string;
    attributes: string[];
    useCases: string[];
    audiences: string[];
  };
  keywords: Array<{
    keywordId: string;
    term: string;
    searchVolumeBand: "very_low" | "low" | "medium" | "high" | "very_high";
    searchVolumeEstimate?: number;
    relevance: "core" | "high" | "medium" | "low" | "irrelevant";
    intent:
      "generic" | "branded" | "competitor" | "feature" | "use_case" | "audience" | "complementary";
    competitionBand: "low" | "medium" | "high";
    suggestedMatchTypes: Array<"exact" | "phrase" | "broad">;
    launchPriority: "exclude" | "research" | "secondary" | "primary";
    expectedNegative?: "exact" | "phrase" | null;
    notes?: string;
  }>;
};
```

Volume bands for beginner exercises; precise estimates exposed only at
advanced difficulty.

### 3. Keyword Research becomes a separate registry entry

Yes — new `keyword-research` registry entry. Listing Audit consumes/
references keyword datasets but does not generate them. Listing Audit
owns evaluating content and identifying gaps; Keyword Research Lab owns
cleaning terms, classifying relevance/intent, grouping, assigning match
types, selecting negatives, prioritizing, and producing launch clusters.

### 4. Dataset versions tie to scenario versions (required)

```ts
scenarioVersion: "1.2.0";
keywordDatasetId: "kw-home-drawer-us";
keywordDatasetVersion: "1.1.0";
rubricVersion: "2.0.0";
```

Attempts persist all of these — see
`docs/simulator-remediation-decisions.md`. Otherwise a dataset update
silently changes the expected answer for old attempts.

### 5. Launch coverage

5 categories × 2 niches = 10 curated datasets:

| Category          | Niches                                   |
| ----------------- | ---------------------------------------- |
| Home & Kitchen    | Drawer organizer, insulated water bottle |
| Beauty            | Vitamin C serum, hair mask               |
| Pet Supplies      | Dog grooming brush, cat water fountain   |
| Sports & Outdoors | Resistance bands, yoga mat               |
| Electronics       | USB-C hub, wireless earbuds case         |

Fallback for uncurated niches: a clearly labeled generic sandbox dataset,
no dynamically generated fake precise volume, credential scoring
disabled, practice-only classification permitted.

## Suggested split

- **STORY-081a:** Dataset type + loader + fallback-sandbox behavior
  (items 2, 5's fallback rule).
- **STORY-081b:** Curate and author the 10 launch datasets (item 5's
  coverage list) — content work, may not need Ryan's direct authoring
  time if a template + review process is set up first.
- **STORY-081c:** Split Keyword Research into its own registry entry
  (item 3).
- **STORY-081d:** Version-tie datasets to scenarios/attempts (item 4).

## Acceptance criteria

- [ ] Split confirmed (or explicitly kept as one story) before work starts
- [ ] `KeywordDataset` type + loader implemented per the schema above
- [ ] `near me` and other non-transferable local-intent templates removed
- [ ] 10 curated datasets authored across the 5 launch categories
- [ ] Fallback sandbox dataset behavior implemented and tested (labeled,
      not credential-scored)
- [ ] Keyword Research is a separate registry entry, still reachable from
      the existing page alias
- [ ] Attempts persist `keywordDatasetId`/`keywordDatasetVersion` alongside
      `scenarioVersion`/`rubricVersion`
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
