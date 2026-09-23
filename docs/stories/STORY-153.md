# STORY-153: Recompute every worked example in the unaudited modules

**Status:** merged in PR #557
**Depends on:** STORY-149 and STORY-150, which converted Modules 1 to 4, 9 and 11 to pesos and
repaired three cases where a correct peso answer had been divided by 50 to meet a stale dollar
input

## Scope

A read-only audit recomputed the printed arithmetic in the 19 lessons that had never had a numeric
pass: Modules 0, 5, 6, 7, 8 and 10. Every ratio, sum and derived figure was recalculated from the
numbers the lesson itself displays. Nothing here is a judgment about real-world Amazon data, which
stays with the content owner.

Seven of the eleven findings were confirmed against the source lines and fixed. The other four are
reported to Ryan instead of being edited, because two are policy contradictions and two are
structural.

## Fixed

| File | What the learner was told | What follows from the lesson's own inputs |
| --- | --- | --- |
| `0.3-first-simulation.mdx` | Client has "about ₱500 a month" for ads, three times | That is `$500` unconverted, about ₱17 a day, below one click at any CPC this course teaches. Now ₱25,000 a month, which is the ceiling the same lesson's checklist already displays |
| `10.2-explaining-numbers.mdx` | ACoS 22% means "the ad spent 22 cents for each peso" | Dollar-era unit phrasing surviving a conversion. Now "₱22 for every ₱100 of ad-attributed sales" |
| `6.2-placement-adjustments.mdx` | `₱38 × 1.3 × 1.5 = ₱73` | 74.10. The print was ₱1 light on the lesson's own worked example, three lines before it tells you to always do this calculation |
| `6.2-placement-adjustments.mdx` | Step 3 divides by 1.3 without stating a 30% increase anywhere in the brief | The brief specifies Dynamic Down Only, which has no upward multiplier. Step 3 now names the assumption it borrows from the safer scenario above it |
| `6.3-bid-elevator-prep.mdx` | A ₱1,500 product at 10% CVR and a ₱750 product at 20% CVR "have very different max CPCs" | By this lesson's own formula both earn ₱150 per click, so the ceilings are identical. The example now teaches the real point: price alone does not set a ceiling, price × CVR does, and ₱1,500 at 5% is the case where they diverge |
| `6.1-bid-strategies.mdx` | Answer key: Dynamic Up and Down raises "up to 100% at standard placements" | The body two columns up says 100% at top of search and 50% at other placements, which is also what the lesson's SelfCheck tests. Answer key corrected to the body |
| `5.2-budget-pacing.mdx` | "Friday may need 30% more budget than Sunday" | The table directly above is ₱1,300 against ₱500, which is 2.6x, and this lesson's own answer says "more than double Sunday's ₱500". The 30% is Friday against a normal weekday, so the bullet now states both comparisons |
| `8.2-share-of-voice.mdx` | Worked answer: "pull Amazon's Search Term Impression Share report ... it gives your actual impression share" | The same lesson spends two sections establishing that no such pullable report exists and SOV is an estimate you build, and its later answer says so. The instruction now tells the learner how to tighten the estimate |

The `6.3` and `8.2` cases were the most damaging, because in both the lesson's own answer key
contradicted the thing the lesson exists to teach.

## Reported, not edited

- `7.1-search-term-analysis.mdx:127` negates a term at "5+ clicks and zero conversions" while
  `7.3-str-triage-prep.mdx` uses 10+ clicks in four places, including its grid. A learner moving
  between the two gets opposite verdicts on near-identical data. The reconciliation is a teaching
  policy: either the thresholds differ on purpose, for example tested versus proven keywords, or
  one is wrong. Ryan decides.
- `0.2-platform-tour.mdx:34` calls Modules 0 to 8 "the full module lineup", and `8.3` closes with
  "That's the end of the course", while Modules 9, 10 and 11 exist and `0.1` already promises
  artifacts that only those modules produce. Correct but not arithmetic, and the tour copy needs
  to know whether a Foundations learner should see Mastery modules at all.
- `0.2-platform-tour.mdx:58` lists six triage actions and omits raising a bid; `7.3` teaches five
  with Increase Bid as one of them. Same file as the previous row, so it belongs in that rewrite.
- `10.3-no-impressions-low-ctr.mdx:21` passes empty props to a `:::visual` block. Cosmetic, no
  learner-visible effect found.

## Verification

- Each fix checked against the two or three source lines around it, not against the audit summary
- `validate:lesson-production` 45/45, `validate:learning-release` pass, all 12 tests under
  `src/domain/curriculum` pass
- No literal `$` before a digit found anywhere in the 19 audited files, which is also what
  `CurriculumCurrency.test.ts` enforces permanently
