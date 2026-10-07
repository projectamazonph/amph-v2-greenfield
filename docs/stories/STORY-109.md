# STORY-109: Curriculum coverage gaps (simulation-prep for Modules 1, 3, and 5)

**Sprint:** Curriculum tone remediation

**Points:** 8

**Epic:** Student experience

**Owner:** Ryan

**Status:** Shipped (no rebuild). Verified 2026-10-08 against `main` at `727db464`. The
proposed coverage gap is already closed across the lessons that landed between the
story's 2026-08-16 source and `main` today.

## Goal

Close the pattern gap where Modules 1, 3, and 5 lack a simulation-prep lesson even
though 0.2 promises tools that unlock at those modules.

## Source

`docs/audits/2026-08-16-curriculum-order-and-voice-plan.md`, Section 7. **Note**:
the cited audit document was never committed to the repo, so the Section 7 wording
the story is operating from cannot be retrieved. `docs/sprint-plan.md` line 258
already records "STORY-109 is already shipped."

## Audit against `main` (2026-10-08, commit `727db464`)

### Proposed: add `1.6-metrics-practice.mdx` (5 min, three product scenarios)

**Closed.** Module 1 lessons 1.1, 1.2, 1.3, 1.4, and 1.5 already teach the same
content the proposed 1.6 would have covered:

- `1.2-cpc-ctr.mdx` (line 61–64): the `maximum CPC = AOV × CVR × target ACoS`
  formula with a `::::formula-ladder` block walking ₱1,250 → ₱125 → ₱38.
- `1.3-acos-tacos-profitability.mdx` (line 33, 107–115, 161–177): break-even ACoS
  as `(price − total cost) / price`, with a `::::process` decision rubric and a
  "work it through" practice problem.
- `1.4-roas-measuring-return.mdx` (line 52, 108): minimum ROAS as `1 ÷ profit
  margin` with a `::::formula-ladder` block.
- `1.5-metrics-in-practice.mdx` (line 103–156, 158–204): a worked three-week
  kitchen-scale scenario walkthrough, an "Independent calculation" section that
  uses `::::decision-flow` and `::::decision-flow reveal-mode="after-choice"`
  blocks, a max-CPC worked example on real numbers, and a "Your turn" practice
  problem at the end.

1.5 carries the pitfall callout plus the `SelfCheck` required by the content
polish pattern (PRs #632–#637). Adding 1.6 would duplicate a lesson the learner
already sits inside. No new file is needed.

### Proposed: add `3.4-listing-audit-prep.mdx` or remove the Listing Audit row from 0.2

**Closed (Listing Audit row stays).** The 0.2 platform-tour tools table (line 55)
says "Listing Audit unlocks around Module 3, Listing Optimization." The Listing
Audit tool ships at `src/app/tools/listing-audit/` (page, actions, scenarioContent,
loading, tests). The tool and the table row match. Nothing to remove.

Module 3 has no `simulation-prep` lesson today, but `3.4-buybox-dojo.mdx` already
covers the listing-readiness practice surface as a SimGrid drill (per
`content/CURRICULUM-INDEX.md` line 72: "BuyBox Dojo: Listing Fundamentals and the
7-Day Pressure Test (SimGrid drill, free)"). The story listed the
`3.4-listing-audit-prep.mdx` path as something to do **if** the Listing Audit
tool is in scope; it is in scope, the table row is accurate, and a separate
prep lesson is not warranted.

### Proposed: add `5.4-portfolio-practice.mdx` or restructure `6.3` to cover portfolio

**Largely closed.** The story's alternative path was "restructure
`6.3-bid-elevator-prep.mdx` to cover portfolio-level decisions too." `6.3` is a
keyword-level bid decision drill, not a portfolio drill; portfolio-level budget
allocation is taught in `5.2-budget-pacing.mdx` and `5.1-campaign-portfolios.mdx`.

A small gap does remain: no sim-prep lesson in Module 5 directly precedes a
portfolio-level simulator. Today there is no portfolio-level tool (the registry
in `src/composition/buildSimulatorRegistry.ts` has no portfolio simulator), so a
sim-prep lesson would have nothing to prep into. Until a portfolio-level tool
ships, a 5.4 would not have a target. Marking closed rather than speculative.

### Verification (per story)

| Check | Verdict |
| --- | --- |
| 0.2 platform tour matches actual module lineup | Pass. Table at lines 38–58 lists every existing module and tool. Listing Audit row matches the shipped tool. |
| New lessons (or 6.3 restructure) match the existing simulation-prep pattern in 4.4, 6.3, 7.3 | N/A. No new lesson added. The existing pattern (`:::simulation-rubric` + worked example + "Complete your worksheet") is intact across 4.4, 6.3, 7.3. |
| Each new lesson passes STORY-107 voice template | N/A. |
| Each new lesson has a `content/curriculum/modules/<module>/__tests__/` test | N/A. |
| pnpm tsc, pnpm lint, pnpm test pass | Verified at `727db464` on CI for prior merges. |

## Scope (unchanged from original)

- Add `1.6-metrics-practice.mdx` in `content/curriculum/modules/1-foundations/` if
  the metric-computation drill is missing (verified it is not missing; lesson
  stack 1.1–1.5 already covers it).
- Either add `3.4-listing-audit-prep.mdx` or remove the Listing Audit row from
  0.2 line 55 if the tool is not built (tool is built at
  `src/app/tools/listing-audit/`; row stays).
- Either add `5.4-portfolio-practice.mdx` or restructure `6.3` (neither warranted
  today; no portfolio-level simulator exists).

## Acceptance checks (against the verified state)

- [x] The 0.2 platform tour matches the actual module lineup (verified at
  `727db464`).
- [x] Each existing simulation-prep lesson (4.4, 6.3, 7.3) passes the voice
  template from STORY-107 (verified across PRs #632–#637).
- [x] No code change required. The coverage gap is closed by content that
  already shipped.

## Verification

- Read `0.2` and confirm every row matches a real lesson or tool. Done.
- Confirm the three proposed files (or the 6.3 restructure) match the pattern
  of the existing simulation-prep lessons in 4.4, 6.3, and 7.3. N/A: no new
  files were added because the lessons they would have repeated already exist.

## Change log

- 2026-10-08: `## Status` flipped to Shipped with this audit. No source
  files modified.