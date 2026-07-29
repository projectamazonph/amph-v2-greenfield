# STORY-083: Non-binary, category-aware Listing Audit ground truth

## Status

**Blocked — needs Ryan's PPC/listing input.** Per `docs/sprint-plan.md`
Sprint 15 and `docs/audit-2026-07-26-simulator-accuracy-review.md`
Phase 2. **This is the story that actually closes the click-through
bypass** — Phase 0 (Sprint 14) only shrank the margin; measured against
the real simulator, "mark everything fix" still passes at every difficulty
today (beginner 75 vs. a 70 threshold, advanced 82 vs. 75 — see the audit
doc's "How far the mechanical fixes actually get us" section).

## Current mechanism (verbatim, `ListingAuditSimulator.ts:groundTruthAction`)

```ts
function groundTruthAction(severity: FindingSeverity): FindingAction {
  return severity === "info" ? "skip" : "fix";
}
```

This is the entire ground-truth rule. It is a pure function of severity —
category, marketplace, product strategy, existing performance, and
compliance risk play no part. Since the finding generator (STORY-080's
concern) currently skews heavily toward `warning`/`critical` findings that
this rule always calls `fix`, marking every finding `fix` is very close to
always correct: the audit doc's real-simulator measurement shows a 4-finding
weak listing scoring `direction = 75` (3 of 4 findings really are `fix`)
just by always answering `fix`.

## Why STORY-080 alone can't close this

A richer, more balanced finding set (STORY-080) helps, but as long as the
ground-truth _rule_ is "warning/critical ⇒ always fix," a learner who
learns that one fact can still guess correctly on most findings without
reading them. Closing the bypass needs the rule itself to depend on more
than severity, so severity stops being a reliable proxy for the answer.

## Open questions for Ryan

1. **Are there real cases where a `warning`/`critical`-severity finding is
   correctly `skip`?** E.g. a stylistic suggestion that's genuinely
   optional in some categories/marketplaces even though it's flagged at
   `warning` severity. Give concrete examples per category
   (title/bullets/description/backend).
   **Answer:**

2. **Should ground truth stay binary (fix/skip), or do you want more
   actions** — e.g. "defer" (fix later, not urgent), "escalate" (needs
   legal/compliance review), "context-dependent" (correct action varies by
   strategy)? If more actions, define them.
   **Answer:**

3. **What additional signals should ground truth depend on**, beyond
   severity and category? Candidates: marketplace (US vs. other), product
   compliance category (regulated vs. not), current conversion
   performance, existing image count, seller's stated strategy for this
   listing (e.g. "budget/value" vs. "premium"). Which of these does
   `ListingAuditInput` need to gain as new fields, and what's the rule for
   each?
   **Answer:**

4. **Do you want this coupled with STORY-080's finding-generator richness
   in one story, or delivered separately?** The audit doc treats them as a
   pair (richer findings + non-binary ground truth) but they're separately
   stoppable if you'd rather review them one at a time.
   **Answer:**

5. **What does "done" look like, measurably?** E.g.: "mark everything fix"
   should score below the beginner passing threshold (70) against a
   representative scenario set. Do you want that as a literal regression
   test (a fixed scenario + a fixed all-fix strategy asserted to fail), so
   this bypass can't silently regress again?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the rule and any new input fields are specified, implementation is
ordinary domain work: extend `ListingAuditInput` with whatever new fields
Q3 requires, replace `groundTruthAction()`'s severity-only branch with the
specified rule (and extend `FindingAction` if Q2 adds actions), and add the
regression test from Q5 alongside the existing scoring tests.

## Non-goals

- Machine-learned or externally-sourced ground truth. This story is about
  encoding Ryan's explicit rules, not training a model.

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q5 answered by Ryan (no TBDs remain)
- [ ] `groundTruthAction()` depends on more than severity alone, matching
      Ryan's specified rule
- [ ] Any new required input fields added to `ListingAuditInput`
- [ ] Regression test asserts "mark everything fix" scores below the
      beginner passing threshold on a representative scenario
- [ ] Domain tests cover each new ground-truth branch
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
