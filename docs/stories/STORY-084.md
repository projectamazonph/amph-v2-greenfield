# STORY-084: Campaign Builder strategic scoring

## Status

**Blocked — needs Ryan's PPC campaign-structure input.** Per
`docs/sprint-plan.md` Sprint 15 and
`docs/audit-2026-07-26-simulator-accuracy-review.md` Phase 2.

## Current mechanism (verbatim, `CampaignBuilderSimulator.ts`)

```ts
// structureQuality: % of {SP Manual, SP Auto, SB} campaign types the user covered
// budgetAllocation: % of user campaigns whose budget is within 50% of ground truth
// keywordRelevance: % of user keywords containing a word from the niche string
```

`CampaignStructure`/`AdGroup` (the data the user submits and is graded on)
has no concept of negative keywords at all. There is no check for the same
keyword+match-type appearing in more than one ad group or campaign
(duplication/cannibalization), no branded-vs-non-branded distinction, no
explicit match-type-mixing check within an ad group, no naming-convention
grading beyond whatever the ground-truth generator's own template produces,
and no check that the user's campaign budgets reconcile to the stated
`monthlyBudget`.

## Open questions for Ryan

1. **Negative-keyword architecture** — what negatives do you expect
   structurally? E.g., should the SP Auto campaign carry the SP Manual
   campaign's exact-match keywords as negatives, to prevent the two from
   competing for the same search? Does `CampaignStructure`/`AdGroup` need a
   new `negativeKeywords` field to grade this?
   **Answer:**

2. **Target duplication** — is the same keyword+match-type appearing in
   more than one ad group/campaign always wrong, or situationally fine
   (e.g. exact-match in Manual + broad-match in Auto is expected, but exact
   in two different Manual ad groups is not)? Give the specific rule.
   **Answer:**

3. **Branded isolation** — what determines "branded" here (a brand-name
   list per scenario, similar to STR Triage's Q5 in STORY-082)? Should
   branded campaigns get separate budget or scoring treatment, and if so
   what?
   **Answer:**

4. **Match-type separation** — is "one match type per ad group" the rule?
   Is that already implicit in the ground-truth generator's own structure
   (it currently splits Exact/Phrase into separate ad groups), or does
   grading need to explicitly check the _user's_ submission for mixed
   match types within one ad group?
   **Answer:**

5. **Naming compliance** — the ground truth currently names campaigns
   `"{SP|SB} | {MatchType} | {niche} | ₱{budget}/d"`. Is that the
   convention to grade the user's naming against, or do you use a
   different house convention that should replace it (and be graded
   instead)?
   **Answer:**

6. **Budget reconciliation** — should scoring check that the user's total
   campaign budgets sum close to the stated `monthlyBudget` (currently
   unchecked entirely)? What tolerance?
   **Answer:**

## What ships once answered (mechanical, agent-doable)

Once the structural rules are specified, this is ordinary domain work:
extend `CampaignStructure`/`AdGroup` with a `negativeKeywords` field if Q1
requires it, add duplication/branded/match-type/naming/budget-reconciliation
checks as new dimensions or refinements of the existing three, and update
`scripts/seed-simulator-policies.ts` weights to include them. Tests assert
each new check against Ryan-supplied example submissions (a correct
structure and at least one flawed one per rule).

## Non-goals

- Multi-marketplace campaign structuring (this simulator is scoped to a
  single marketplace's structure per the existing input shape).

## Acceptance criteria (contingent on answers above)

- [ ] Q1–Q6 answered by Ryan (no TBDs remain)
- [ ] `CampaignStructure`/`AdGroup` extended with `negativeKeywords` if Q1
      requires it
- [ ] New dimension(s) or refinements for duplication, branded isolation,
      match-type separation, naming compliance, and budget reconciliation
      implemented per Ryan's rules
- [ ] `seed-simulator-policies.ts` updated with new/adjusted dimension
      weights
- [ ] Domain tests cover each new check against Ryan-supplied example
      submissions
- [ ] `pnpm typecheck && pnpm lint && pnpm test` green
- [ ] PR against `main`, CI green, squash merge
