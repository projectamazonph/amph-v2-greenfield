# STORY-149 — Correct peso magnitudes in the converted lesson examples

**Sprint:** Learning experience uplift, content correctness
**Points:** 3
**Epic:** Lesson delivery
**Owner:** Ryan
**Status:** In review

## Goal

Every money figure a learner can do arithmetic on in a lesson is stated at a
realistic Philippine peso magnitude, and every ratio the lesson prints (ACoS,
ROAS, CPC, CTR, CVR, TACoS) still follows from the numbers beside it.

## Context

PR #549 converted the Foundations examples from US dollars to pesos. Three of
those conversions went the wrong way. Where a lesson had one stale dollar-magnitude
input sitting next to results that were already correct pesos, the change divided
the results by about 50 to meet the stale input instead of scaling the input up.
The merged text is internally consistent and wrong in both directions at once.

`1.2` is the clearest case. Before #549 the worked answer read:

```text
Maximum CPC = ₱22 × 0.09 × 0.28 = ₱28. Actual CPC = ₱84 ÷ 70 = ₱60
```

`₱28` and `₱60` were the right peso answers; `₱22` and `₱84` were dollar figures
wearing a peso sign, since ₱22 × 0.09 × 0.28 is ₱0.55, not ₱28. #549 "repaired"
the visible contradiction by replacing the correct results with ₱0.55 and ₱1.20, so
the multiplication checked out and the lesson ended up teaching a CPC of one peso.
`1.1` lost the same way: its line read "The maximum CPC is about ₱30. The actual CPC
is ₱60" before #549 and reads ₱0.60 and ₱1.20 after it.

The fix is the other direction: scale the whole example up by 50 so the inputs
become ₱1,100 and ₱4,200, and the original ₱28 and ₱60 answers come back correct.

This is not only a #549 problem. An audit of all 45 lessons found the same class of
defect in lessons this branch did not touch:

- `2.3` search-term tables had rows still in dollar figures with a peso sign
  pasted in front (`₱30.15` of spend across 45 clicks, a ₱0.67 CPC) while two of
  its totals had already been scaled by 50 (`₱5,963` and `₱2,245`). The rows
  summed to a fifth of the stated total.
- `2.4` taught a bid ladder of ₱3 to ₱12 while `4.3` and Module 6 use bids of
  ₱18 to ₱125 for comparable products.
- `-1.1` priced an FBA fee for a large standard-size item at ₱80 to ₱100.
- `1.4`, `6.1` and `0.3` still framed several sentences in dollars.

## The conversion convention

Working rate of about ₱50 per US$1, applied to the whole example at once, never
to one line inside it. Two independent anchors confirm the rate is the one the
existing content already assumed:

- `1.3` states a total cost to sell of ₱1,350 and a pre-ad margin of ₱1,150 on a
  ₱2,500 product. Those figures only reconcile if the referral fee is 15% of
  ₱2,500 (₱375) and the FBA fee is ₱225, which is the ×50 reading of the original
  $7.50 and $4.50.
- `2.3`'s already-scaled total of ₱5,963 equals the unconverted row figures times
  exactly 50, and the scaled waste figure ₱2,245 equals the four zero-sale rows
  times 50.

So this branch scales whole examples by 50 and then re-checks each derived number
rather than trusting the scaling.

## Changes

Foundations, the regression itself:

- `1.1`: price ₱2,000, spend ₱9,600, ad sales ₱16,000, total sales ₱40,000, and
  the same in the `coffee-grinder-case` visual. Maximum CPC becomes
  `₱2,000 × 0.30 × 0.05 = ₱30` against an actual CPC of ₱60, preserving the
  lesson's "pays about twice the ceiling" point at 60% ACoS. The Your-turn case
  moves to ₱9,000 spend / ₱45,000 sales / ₱2,500 price and keeps CTR 3.0%,
  CVR 15% and ACoS 20%.
- `1.2`: the cheap-CPC comparison becomes ₱25 at 5% versus ₱100 at 20%, both
  ₱500 per order. The thermometer case becomes ₱1,100 price and ₱4,200 spend over
  70 clicks, giving `₱1,100 × 0.09 × 0.28 = ₱27.72` against an actual ₱60. Quick
  check moves to ₱1,500 price and ₱7,500 spend for 200 clicks, both sides ₱37.50.
- `1.3`: referral and FBA fees corrected to ₱375 and ₱225 so the cost stack adds
  to the ₱1,350 the lesson already printed. Week 1 and Week 3 ad data, the TACoS
  monthly example, the water-bottle table, the travel-pillow case and the quick
  check all rescaled. The water-bottle table now satisfies every one of its own
  rows at once: ₱10,500 ÷ 150 clicks = the ₱70 CPC it lists, and 18 orders ×
  ₱1,500 = the ₱27,000 ad sales it lists.
- `1.4`: the yoga block is ₱1,750 and the two campaigns are ₱20,000/₱78,750 and
  ₱10,000/₱35,000, which keeps 12.9% and 11.1% CVR, 25.4% and 28.6% ACoS, and
  3.94x and 3.50x ROAS. Both the prose and the `roas-scale-efficiency` comparison
  table changed together. Dollar framing replaced with peso framing in three
  sentences, including one "you get ₱175 back" that had been half-converted.
- `1.5`: shaker bottle ₱950, and the maximum-CPC question uses a ₱1,750 product
  for a ₱42 answer.

Rest of the course, same defect class:

- `2.1` water bottle ₱2,250 with ₱55 and ₱47.50 CPCs. `2.2` oven mitt ₱1,100.
- `2.3` both search-term tables scaled so the rows sum to the totals that were
  already scaled. The negative-candidate threshold becomes "spent more than ₱500
  with 0 sales", and the Your-turn case becomes a ₱1,000 mat with ₱450 and ₱800
  spend.
- `2.4` bid ladder rebuilt to ₱8 to ₱38, capped at the ₱38 maximum CPC `1.2`
  derives for the same bamboo cutting board, with a sentence saying so.
- `3.3` the rationale paragraph now quotes the ₱30 CPC its own case uses instead
  of ₱0.60. `4.3` the filing-cabinet diagram bids ₱75 / ₱40 / ₱18, matching the
  prose. `9.2` baseline CPC ₱60. `11.4` capstone scenario ₱2,250 spend and
  ₱9,000 sales, still 25% ACoS.
- `-1.1` FBA fee range ₱200 to ₱300 for a large standard-size item.
- `0.3`, `6.1`, `8.2` dollar wording and a stale "US marketplace examples" fact
  card scope. `1.1` and `1.2` scopes updated the same way, since both now teach
  in pesos.

## Out of scope

- `content/curriculum/quiz-questions.json` still holds 52 dollar amounts. The quiz
  bank renders in the player next to lesson content that is now in pesos, so it
  needs the same whole-question treatment with the explanation text recomputed.
  Separate change.
- Fact cards remain missing on 16 of 45 lessons, and `Last verified` is still
  unresolved on every card. Those need a subject-matter owner, not a script.

## Verification

- `pnpm validate:lesson-production`: 45/45 lessons complete, no block issues.
- `pnpm validate:curriculum`: 45 lessons, 475 planned minutes, unchanged.
- `pnpm validate:learning-release`: passed.
- A scan for any remaining peso amount below 100 with cents-style decimals returns
  only four legitimate results: the ₱27.72 and ₱37.50 maximum-CPC ceilings, the
  ₱57.50 bid target, and the ₱47.50 CPC being criticised.
- Content and lesson suites, architecture checks, `typecheck`, and `lint` run clean.

## Acceptance criteria

- [x] No lesson states a product price, ad spend, ad sales or bid at cents scale.
- [x] Every ratio printed next to its inputs still computes from them.
- [x] Table rows sum to the table totals that were already converted.
- [x] Diagram and visual JSON payloads changed with the prose that describes them.
- [x] No new `Last verified` date invented.
