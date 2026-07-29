# STORY-082: Expand STR Triage classifier

## Status

**Blocked — needs Ryan's PPC search-term-triage input.** Per
`docs/sprint-plan.md` Sprint 15 and
`docs/audit-2026-07-26-simulator-accuracy-review.md` Phase 2.

## Current mechanism (verbatim, `StrTriageSimulator.ts:classify`)

```ts
const avgSpendPerKeyword = 25; // assumed budget per keyword for classification
const spendRatio = row.spend / avgSpendPerKeyword;

if (roas >= targetRoas * 0.8 && spendRatio < 0.3) return "add_as_exact";
if (roas >= targetRoas * 0.7 && roas < targetRoas && spendRatio >= 0.5) return "add_as_phrase";
if (roas < targetRoas && spendRatio > 0.8) return "pause";
return "keep"; // default
```

`KeywordPerfRow` (the input shape) only carries `spend`, `revenue`, and
`orders` — no clicks, no impressions. The classifier's only signals are
spend, revenue-derived ROAS, and a hardcoded `$25`/keyword spend assumption
that has no relationship to the actual campaign's budget or spend
distribution.

## Open questions for Ryan

1. **What should `avgSpendPerKeyword = 25` be replaced with?** Options:
   (a) spend ratio relative to total campaign/account spend, (b) a target
   CPC × expected-clicks baseline, (c) something else entirely. What's the
   real basis you use for "has this term spent enough to judge it"?
   **Answer:**

2. **Does the real decision need clicks and impressions?** `KeywordPerfRow`
   has neither today. If click-through rate or statistical significance
   (minimum click/impression count before acting) matters to your real
   triage process, what thresholds, and should these become new required
   input fields?
   **Answer:**

3. **"Existing target detection"** — does this mean checking whether a
   search term already exists as a keyword target elsewhere in the
   account? If so, what does "existing" as input data look like (a list of
   current keyword targets per scenario), and how should it change the
   recommended action (e.g. suppress "add_as_exact" if already targeted,
   recommend negative instead)?
   **Answer:**

4. **Negative-match precision** — should the classifier distinguish
   negative-exact from negative-phrase, and on what basis (spend with zero
   orders, volume, overlap with a targeted term)?
   **Answer:**

5. **Branded vs. non-branded routing** — what determines "branded" for a
   search term (a brand-term list you supply per scenario, or a pattern
   match against the product/brand name)? Should branded terms get
   different thresholds or a different action set entirely?
   **Answer:**

6. **Data-delay awareness** — Amazon attribution has a reporting lag. Do
   you want a minimum order count, spend threshold, or elapsed-days
   assumption before a pause/add decision is "statistically confident,"
   and what happens below that threshold (a fifth "insufficient data"
   action, or a hold on grading that row)?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the real basis for each threshold and any new required input fields
are specified, this is ordinary domain work: extend `KeywordPerfRow`/
`StrTriageInput` with whatever new fields Q2/Q3/Q5 require, replace
`classify()`'s branching with the specified rules, extend `TriageAction` if
a new action (negative-exact/phrase, insufficient-data) is added, and write
tests against Ryan-supplied worked examples per rule.

## Non-goals

- Full attribution-model rebuild (multi-touch attribution, view-through
  conversions). This story extends the classification rules, not Amazon's
  underlying reporting model.

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q6 answered by Ryan (no TBDs remain)
- [ ] `avgSpendPerKeyword` hardcoded constant removed and replaced per Q1
- [ ] Any new required input fields (clicks, impressions, existing targets,
      brand-term list) added to `StrTriageInput`/`KeywordPerfRow`
- [ ] `classify()` rules match Ryan's stated thresholds, verified against
      worked numeric examples he supplies
- [ ] Domain tests cover each new branch with full coverage
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
