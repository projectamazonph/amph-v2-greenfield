# STORY-081: Replace hardcoded keyword volumes with versioned scenario datasets

## Status

**Blocked — needs Ryan's keyword-research input (or a sourcing decision).**
Per `docs/sprint-plan.md` Sprint 15 and
`docs/audit-2026-07-26-simulator-accuracy-review.md` Phase 2.

## Current mechanism (verbatim, `ListingAuditSimulator.ts:generateKeywords`)

```ts
const templates: Array<[string, number, KeywordResult["competition"]]> = [
  [`${lower}`, 5000, "high"],
  [`${lower} buy online`, 2000, "medium"],
  [`best ${lower}`, 3000, "high"],
  [`${words[0]} ${words[words.length - 1]} reviews`, 1000, "low"],
  [`${lower} cheap`, 1500, "medium"],
  [`${lower} for ${words[0]}`, 800, "low"],
  [`wholesale ${lower}`, 300, "low"],
  [`${lower} near me`, 2000, "medium"],
  // ...
];
```

Every keyword is a string template applied to whatever `niche` the learner
typed, and every volume/competition figure is a literal constant, identical
in shape for every niche. `${lower} near me` is local-search intent that
doesn't transfer to Amazon retail search — the audit doc flags this
specifically. `Campaign Builder`'s `generateKeywords` (a separate, smaller
template list) has the same structural problem, though it's not explicitly
in this story's title.

## Open questions for Ryan

1. **Where should real keyword data come from?** Options: (a) you export
   real keyword-research data (e.g. from a tool you use) that gets curated
   into per-niche datasets, (b) synthetic-but-realistic distributions you
   specify per category (e.g. "a mid-competition consumer-goods niche looks
   like: 1 head term at 3000-8000/mo, 3-5 mid-tail at 500-2000, 5+ long-tail
   under 300"), (c) something else.
   **Answer:**

2. **What's the dataset shape?** A `KeywordScenarioDataset` keyed by
   niche/category (similar in spirit to how `SimulatorScenario` JSON already
   works for other simulators) with `(keyword, volume, competition)`
   tuples authored per scenario? Or keyed more broadly by category so many
   niches within a category share a distribution shape?
   **Answer:**

3. **Should Keyword Research become a genuinely separate concern from
   Listing Audit**, per the story title — its own registry entry / scenario
   file, still reachable from the same page alias — or is decoupling the
   _data_ (own dataset, still one simulator) sufficient?
   **Answer:**

4. **Versioning:** do you want dataset versions tied to scenario versions so
   a learner's historical attempt stays reproducible against the dataset
   that graded it, matching any existing scenario-versioning convention in
   the repo? Or is versioning out of scope for this pass?
   **Answer:**

5. **How many niches/categories need a curated dataset for launch** — is
   this a handful of the most common course niches, or does every niche a
   learner might type need coverage (with a fallback distribution for
   anything uncurated)?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the sourcing decision and dataset shape are fixed, this is
infrastructure work: define the dataset type, a repository/loader for it
(JSON file per niche/category, or a table, depending on Q2), replace
`generateKeywords()`'s template array with a dataset lookup plus a documented
fallback for uncurated niches, and apply the same replacement to Campaign
Builder's keyword generator if Ryan confirms it's in scope. Tests assert the
loader returns exactly what's in a given dataset fixture — no invented
numbers.

## Non-goals

- Live integration with an external keyword-research API. This story is
  about replacing invented constants with curated-but-static data, not
  building a live data pipeline (that would be a separate, larger story).

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q5 answered by Ryan (no TBDs remain)
- [ ] Keyword dataset type + loader implemented per the agreed shape
- [ ] `near me` and other non-transferable local-intent templates removed
- [ ] Fallback behavior for uncurated niches is explicit and tested, not
      silent
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
