# Lesson arithmetic audit, 2026-09-23

Two read-only passes recomputed every printed ratio, sum and derived figure in all 45 lessons,
which the earlier peso conversions had never done. Each pass recalculated only from numbers
displayed in the same repo, and made no judgment about whether a real-world Amazon figure is
correct. That stays with the content owner.

Pass 1 covered Modules 0, 5, 6, 7, 8 and 10 (19 lessons). Landed as STORY-153 in `PR #557`.
Pass 2 covered Modules -1, 1, 2, 3, 4, 9 and 11 (26 lessons) plus every quiz question for
modules -1 to 4 against its source lesson. That is the source of the open list below.

Modules -1, 9 and 11 recomputed clean. The module -1 to 4 quiz bank is clean: every figure
recomputes, and the garlic-press and campaign-builder questions match `4.3` and `4.4` exactly. No
literal `$` before a digit in either pass, which `CurriculumCurrency.test.ts` now enforces
permanently.

## Fixed in this pass

| File      | Was                                                                             | Now                                                                                                              |
| --------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `1.5:115` | Week 1 prints TACoS 40% with the note "no organic sales yet", while ACoS is 50% | With zero organic sales, total sales are ad sales, so TACoS equals ACoS. Now 50%, and the note says why          |
| `1.5:128` | Week 3 TACoS delta "↓ 38%"                                                      | 50% to 25% is ↓ 50%                                                                                              |
| `1.5:154` | `₱1,250 × 0.11 × 0.25 = ₱35`                                                    | ₱34.38, and the next line now says to round a ceiling down because a ceiling you round up is no longer a ceiling |
| `3.1:108` | "71% higher for B" for ₱26 to ₱45                                               | 19 ÷ 26 = 73%, corrected in the table and in the answer key                                                      |
| `3.1:111` | Listing B ACoS 58%                                                              | ₱45 ÷ (₱1,250 × 6.1%) = 59%. Listing A checks at 17%                                                             |

## Open, needs a decision or a reading pass

Each of these was reported by the audit and is arithmetically or internally verifiable, but fixing
it either needs a judgment call about what the lesson should teach, or was beyond the context left
in the session that found it.

1. `2.4:103` says broad match gets 40% of budget and exact gets 25%. `4.1:97-100` says 50-60% on
   exact and 10-15% on broad. Same lever, same account type, consecutive modules, no overlap. Broad
   is out by 2.6 to 4x and exact by half. Someone has to decide which allocation the course teaches,
   or state the condition that separates them.
2. `4.1:120` answer key allocates product targeting "the remaining 15%, ₱210" of ₱1,400, while the
   same lesson's rule at `:100` caps product targeting at 5-10% (₱70 to ₱140). `4.4:132` repeats
   the 15% figure, so this is a three-place disagreement, not a typo.
3. `2.2:69` instructs "₱500/day budget and let it run for 2 weeks", then prices it as "The ₱14,000
   over 4 weeks". ₱500 × 14 days is ₱7,000. Either the window is four weeks or the cost is half. **Fixed:** the two-week instruction stands and the cost now reads ₱7,000.
4. `3.3:152` takeaway claims "₱30k/year PPC savings" while `:136` and the table at `:134` define
   that same ₱30,000 as the month-12 gap on ₱200,000 of monthly ad sales, which is ₱360k a year.
   A 12x understatement in the lesson's own headline number. **Fixed:** the bullet now calls it the
   ₱30,000 monthly gap that the model above defines it as, and drops the annualized savings promise.
5. `3.3:45` table prints 6%/8%/10% CVR against 50%/38%/30% ACoS with only a ₱38 CPC. The lesson's
   own formula at `:160` is ACoS = CPC ÷ (CVR × price), and no price is given in that section. The
   ₱1,000 to ₱4,000 boards referenced at `:90` yield 63% to 16%, not 50% to 30%. **Fixed:** the
   section now states a price, and it is the ₱1,100 the lesson already uses for its ACoS math at
   `:160`, `:167` and `:196`, not an invented one. The three cells recompute from ₱38 CPC ÷
   (CVR × ₱1,100): 57.6% → 58%, 43.2% → 43%, 34.5% → 35%. The 20-point headline at `:51` and the
   Quick check answer at `:225` now read 23. `1.2` prices a bamboo board at ₱1,250, which with the
   unrounded ₱37.50 CPC does reproduce the old 50/38/30 exactly, but no such price appears anywhere
   in `3.3`, so it was not imported here. Finding 6, about what the 6/8/10 steps are allowed to
   claim, is untouched and still open.
6. `3.3:43` describes the CVR steps 6% → 8% → 10% as lifts matching ranges cited in the same
   paragraph and at `:29` ("up to 8% Basic / 20% Premium", seller-reported 5-17%). The steps are
   +33% and +67% relative, or +2 and +4 points, and neither reading follows from those ranges. This
   one may need the content owner, since it is about what the claim is allowed to say.
7. `4.3:43` hierarchy diagram labels the phrase target "exercise block · ₱40 bid", but the body at
   `:69` assigns ₱40 to "yoga block" and ₱30 to "exercise block". The ₱75 exact and ₱18 broad
   figures agree, so only this one label was crossed. Fixed: the diagram now reads ₱30.

## Carried over from pass 1, still with Ryan

- `7.1:127` negates a search term at "5+ clicks and zero conversions"; `7.3` uses 10+ clicks in four
  places including its decision grid. Opposite verdicts on near-identical data.
- `0.2:34` calls Modules 0 to 8 "the full module lineup" and `8.3:269` closes with "That's the end
  of the course", while Modules 9, 10 and 11 exist and `0.1` promises artifacts only they produce.
  `0.2:58` also lists six triage actions and omits raising a bid, where `7.3` teaches five including
  Increase Bid.
- `10.3:21` passes empty props to a `:::visual` block. Cosmetic, no learner-visible effect found.

## Re-check of Modules 9 and 11

These two modules were recomputed a second time, by a reader who had not seen pass 2's result, to test
whether a second pass finds anything the first missed. Nothing numeric broke: 33% from one order on
three clicks, 25% ACoS from ₱2,250 on ₱9,000, the change-log row that reviews exactly seven days after
`2026-08-24`, and both calendar tables all reproduce from their own printed inputs, and no `$` survives
anywhere in either module. One ambiguity turned up, and it is the only thing changed here.

- `9.3:26` evidence ladder ran "Under 10", "10 to 20", "20 to 40", "40+", so a term at exactly 20 or
  exactly 40 clicks matched two rows that recommend different actions. The ranges are now "10 to 19" and
  "20 to 39". No worked example sits on either boundary (the example uses 15 clicks, the retrieval cue
  asks about 40), so no other figure in the lesson moved.

## Quiz bank cross-check, Modules 5 to 10

The arithmetic passes compared quiz questions to their source lessons only for Modules -1 to 4, plus 9
and 11. The quizzes for Modules 5, 6, 7, 8 and 10, which is 34 questions, had never been read against
the lessons that are supposed to justify them. That pass found 31 consistent and three problems, two of
them a wrong answer key.

- Module 7 Q2 keyed "All of the above" as reasons to add a negative exact, and its explanation asserted
  that a term with ACoS above target justifies negating. `7.2:38` says the opposite ("Lower the bid, do
  not negate") and `7.3:141` calls it a bid problem rather than a relevance problem. Only the irrelevant
  term is supported for negative exact, at `7.1:87`. Rekeyed to C and the explanation rewritten.
- Module 7 Q4 keyed "add as a negative" for a term with 2 clicks, which is below both negating floors the
  module sets (5+ at `7.1:127`, 10+ at `7.3:111`), and justified it with "CTR of 0.4% (2/500) is
  extremely low" when `7.3:135` puts the low-CTR line at below 0.3%. The stem is now 6,000 impressions,
  12 clicks and ₱600: CTR 0.2%, clear of both floors, and a click priced at the ₱50 the course uses as
  its standard. Rekeying was not available here, because with 2 clicks the two remaining do-not-act
  options become indistinguishable and the question has no single defensible answer.
- Module 6 Q4 keys a correct answer that no sentence in Module 6 states. Nothing contradicted it, which
  is exactly why a recompute pass misses this class of problem; the mechanism was simply never taught.
  `6.3`'s Common Bidding Mistakes now carries a bullet for it.

The 2-click question is the third place the unresolved `7.1` 5+ versus `7.3` 10+ clash reaches, so the
replacement figures were picked to clear both numbers instead of choosing a winner between them.

## How to work through this list again

The recomputations are cheap to reproduce. A read-only agent briefed with the scope, the ratio
definitions, and the instruction to report only what the printed numbers themselves contradict,
returns a list like this one in a single pass. All four passes used that shape, and it is worth reusing
after any future currency or figure change, including a pass pointed at one module rather than a whole
band of them.
