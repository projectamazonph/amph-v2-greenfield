# STORY-148 — Modules 6 to 8: persisted retrieval checks (LEARN-027, LEARN-028, LEARN-029)

**Sprint:** Learning experience uplift, wave 2 completion
**Points:** 5
**Epic:** Lesson delivery
**Owner:** Ryan
**Status:** In review

## Goal

A learner in Modules 6, 7 and 8 answers at least one graded-in-memory question
per lesson before the lesson explains the answer, and the attempt is recorded the
same way Module 1's are.

## Context

`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md` lists LEARN-027 to LEARN-029 as "not
started". That label is half stale: Modules 6-8 did receive rich content
directives during the tranche-one and tranche-two rollouts (2 to 4 blocks per
lesson, more than Modules 3-5 carry). What they never received is the interactive
primitive set.

Audited counts on `main` before this change:

- `<SelfCheck>` blocks: 5, all in Module 1 (`1.1` to `1.5`), one each. Modules 2
  to 11 and Module -1 have zero.
- `:::process`, `:::trade-off`, `:::callout`: 14 instances, also confined to
  Modules 0 and 1.

So the active-practice pass for Modules 6-8 means retrieval practice, not new
tables. SelfCheck is the right primitive because it is already built and already
tracked: `src/components/lesson/SelfCheck.tsx` renders it, and
`LessonContent.tsx` injects `lessonSlug` into every instance, so a submitted
answer writes a `RetrievalCheckAttempt` through the LEARN-040 path. Lesson MDX
does not need to pass the slug itself, which is why the Module 1 blocks persist
despite omitting it.

## Scope

One `<SelfCheck>` per Module 6-8 lesson, nine blocks, placed immediately after
`## The decision in one sentence` so the learner commits to an answer before the
lesson argues for it. Ids follow the existing `sc-<module>-<lesson>` convention.

| Lesson     | What the check forces recall of                                                              |
| ---------- | -------------------------------------------------------------------------------------------- |
| `6.1`      | Which bid strategy can push actual CPC above the entered bid                                  |
| `6.2`      | That placement and dynamic multipliers multiply (₱50 × 2.0 × 10.0 = ₱1,000), not add         |
| `6.3`      | That a market CPC above your max CPC means changing the target or leaving the keyword         |
| `7.1`      | That 8 clicks and 2 orders is too little to harvest on                                        |
| `7.2`      | That a relevant converter that is too expensive gets a lower bid, not a negative             |
| `7.3`      | That harvesting is the action needing the most evidence                                       |
| `8.1`      | That a top-100 term gap is a hypothesis until a relevant offer is confirmed                   |
| `8.2`      | That 22% share of voice lands in the Established band and its defend-and-optimize posture     |
| `8.3`      | That competitors strong where you are weak is the vulnerability cell, not the opportunity     |

Every prompt, option set and correct answer is drawn from what the lesson already
teaches. No check introduces a new rule, and no answer key elsewhere in a lesson
was changed.

### Also in this branch

`scripts/check-curriculum-sources.mjs` (from #551) gains the second half of the
provenance question. A reachable URL is not a reviewed claim, so it now tallies
the `Last verified` field by style and lists the cards still awaiting a date. It
also fixes a detection bug of mine: the heading match missed
`## Amazon Ads Fact Card`, so 6 lessons were being counted as cardless.

## Acceptance evidence per the build plan

- **LEARN-027 (Module 6, "a guardrail and a recorded reason")**: 6.1 and 6.3
  already carry the Bid-Change Plan worksheet, which asks for the strategy chosen
  and the reason it fits the data maturity and margin. 6.2 captures placement
  evidence through its `evidence-ledger` block. This story adds the retrieval
  check on top; the guardrail and the recorded reason were already there.
- **LEARN-028 (Module 7, "a defensible action and negative-keyword rationale")**:
  7.1 and 7.3 carry the STR Action Log; 7.2 is the short recap lesson between
  them and points back to 2.3 for the full rule set.
- **LEARN-029 (Module 8, "insights translated into a decision")**: 8.1 and 8.3
  carry the Competitor Gap-Analysis Worksheet; the `insight-router` in 8.1 and
  8.3 and the `competitive-gap-matrix` in 8.3 route a finding to a specific
  campaign action.

## Verification

- `pnpm validate:lesson-production`: 45/45 lessons complete, 0 active-practice
  block issues. That confirms every new `SelfCheck` passes the shape rules
  (kebab-case id, 2 to 5 options, in-range `answerIndex`, explanation length).
- `pnpm exec vitest run tests/unit/content src/components/lesson`: 8 files, 36
  tests pass, including the a11y suite for lesson components.
- `node scripts/check-curriculum-sources.mjs`: 10 distinct cited URLs, 10
  reachable; `Last verified` split now reported as 0 dated / 23 pending text /
  6 bracket todo / 16 no field, with the 29 unreviewed cards listed.
- `pnpm build`: succeeded on this branch, full route table emitted. That matters
  here because lesson MDX with JSX is compiled at build time, so a malformed
  `SelfCheck` block fails the build rather than rendering blank.

## Out of scope

- SelfChecks for Modules 2-5 and 9-11. Same primitive, same pattern, but that is
  26 more lessons and deserves its own review pass.
- `:::process` / `:::trade-off` / `:::callout` outside Modules 0-1. Useful, not
  required by LEARN-027 to LEARN-029.
- Filling the 29 `Last verified` placeholders, which needs the content owner's
  review of Amazon's current help text, not an agent's guess.
