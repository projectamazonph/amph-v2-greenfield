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

The arithmetic passes compared quiz questions to their source lessons only for Modules -1 and 1 to 4,
plus 9 and 11. The quizzes for Modules 5, 6, 7, 8 and 10, which is 34 questions, had never been read
against the lessons that are supposed to justify them. That pass found 31 consistent and three problems,
two of them a wrong answer key.

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

Module 0's five questions had also never been checked, which this section's own first line hid: it said
pass 2 covered "modules -1 to 4" when its file list was Modules -1, 1, 2, 3 and 4. Checked by hand
against `0.1`, `0.3` and the Module -1 primer. Q1 to Q3 and Q5 are supported: `0.1:46` defines
Pay-Per-Click for Q1, `0.1:44` and `-1.1:69` carry the ad-type and visibility claims behind Q2 and Q3,
and `-1.2:94` carries the weak-listing rule behind Q5. Q4 is not, and it is left open deliberately:

- Module 0 Q4 asks what a bid actually controls and keys the answer that your entered bid is the base,
  which the bid strategy setting and placement adjustments then act on. Module 0 and Module -1 never say
  that. The mechanism is taught in Module 6: `6.1:24` and `6.1:58` cover what the base bid does and does
  not cap, and `6.1:93` is the placement-multiplier trap the option describes. `0.3:81` sends the learner
  to Module 1 for "the bid math", which is the max-CPC calculation, not this. So the keyed answer is
  correct and nobody is taught anything false, but the question sits six modules ahead of where the
  course teaches it. Fixing that is a design call with two real answers, teach a watered-down version in
  Module 0 or move the question into the Module 6 check, and moving it shifts those quizzes from 5 and 7
  questions to 4 and 8, which `content/CURRICULUM-INDEX.md:186` and `STATE.md` count per module. So it is
  not a silent edit.

That closes the bank: all 13 quizzes and all 87 questions have now been read against the lessons that are
supposed to justify them.

The 2-click question is the third place the unresolved `7.1` 5+ versus `7.3` 10+ clash reaches, so the
replacement figures were picked to clear both numbers instead of choosing a winner between them.

## What the later checks found, and what is now guarded

Everything above is arithmetic and answer keys. Four more read-only checks ran against the same 45 lessons.

- **Abbreviation coverage.** A token-frequency scan against `content/curriculum/glossary.json` suggested the
  lessons lean on shorthand the glossary does not define. That turned out to be the wrong test. The lessons
  expand terms inline, and `CVR`, `SOV`, `SP`, `SD`, `SB`, `PAT`, `ABA`, `VA` and `ROI` are each spelled out
  where they first appear. Three were genuinely unexpanded and are fixed in #568: `SOP` (used in the `0.1`
  course table, defined only in `11.3`), `STR` (names the required Module 7 artifact while `7.1` writes
  "search term report" in full every time), and `AOV` (in the maximum-CPC decision-flow steps of `1.2` and
  `1.5`).
- **Directive rendering.** All 21 `:::` directive names used in lesson bodies are dispatched in
  `src/app/courses/[slug]/lessons/LessonContent.tsx`, so no lesson leaks raw JSON where a component belongs.
  `callout` and `process` are absent from `JSON_LESSON_DIRECTIVES` in `src/lib/mdx/directive-plugin.ts`
  because they carry inline bodies, not because nothing handles them. One dead branch: `slide` is dispatched
  and used by no lesson.
- **Lesson cross-references.** 42 explicit `Lesson X.Y` pointers name 24 distinct lessons and every target
  exists. `src/domain/curriculum/__tests__/LessonCrossReferences.test.ts` (#571) now pins that, so a renumber
  fails CI instead of quietly stranding a learner.
- **Links.** No lesson body contains a markdown link or an `href` anywhere, so there are no in-lesson URLs to
  rot. The source URLs in the fact cards are bare `https://` text and are not clickable.
- **Navigation promises.** 12 lessons say "Next up is X.Y" or similar, and all 12 name the lesson that actually
  follows in published order, so no learner is pointed at the wrong place. Nothing guards this: the
  cross-reference test requires the word "Lesson" before the number, so these sentences fall outside it. A
  future insert or renumber has to update them by hand. The other 32 non-final lessons carry no such sentence,
  which is a style variation rather than a defect, since the course UI supplies its own next step.
- **Quiz bank shape.** Nothing validated `content/curriculum/quiz-questions.json`. Three tests read it and all
  three only count, so a malformed question would publish silently. `src/domain/curriculum/__tests__/QuizBankStructure.test.ts`
  (#575) now enforces seven rules, each traced to a line in `scripts/seed-all-content.mjs` rather than invented:
  a `correctAnswer` outside A-D yields a question with no correct option, and a duplicated `order` collides the
  primary key at `:348` and aborts the whole seeder mid-publish. On the bank as it stands, 13 quizzes and 87
  questions cover 13 lesson-bearing modules one to one, with no gaps and no orphans.
- **In-lesson self-checks.** `src/components/lesson/SelfCheck.tsx:55` decides correctness with a bare
  `selected === answerIndex` and no range guard, so an out-of-range key is a mid-lesson question no learner can
  pass. All 14 blocks are clean today. `src/domain/curriculum/__tests__/SelfCheckBlocks.test.ts` (#578) pins
  answer range, option count and uniqueness, id uniqueness, and that each id is prefixed with the lesson it sits
  in. The id rule is a prefix rather than an equality, because one lesson holding a second check is legitimate.

Both new gates were mutation-tested rather than trusted. A scratch copy of the data was broken in each of the
ways the rules claim to catch, each produced exactly one red test, and the edits were reverted. The first pass
over the self-checks nearly produced a false finding: three lesson `options` arrays carry a trailing comma, which
is valid JavaScript and invalid strict JSON, and they initially read as out-of-range answers.

## Checks after the gates landed

Six more read-only passes ran against the same 45 lessons and the 87-question bank,
and five of them ended in a merged change. What each one checked, and what it found.

- **Every quiz explanation recomputed against its own lesson** (all 87 questions).
  Zero questions whose correct key is contradicted by its source lesson. Two
  SUSPECTs, both fixed: Module 6 Q1's explanation called Dynamic Bids - Down Only
  "the most conservative strategy" while `6.1:120` scores cost predictability as
  Fixed = Highest and Down Only = High, and `6.1:17`, `:141` and `:147` all recommend
  "Fixed or Down Only" as a pair (#584); and `3.1`'s Quick check asked "17% or 58%"
  for an ACoS its own table prints as 59% at `:111`, which is #583. Module 0 Q2 was
  reported and deliberately not changed, see "Rejected a fix" below.
- **The trade-off closing fence leaked to learners.** `src/lib/mdx/directive-plugin.ts`
  splices a GFM table into a `:::trade-off` body and left the closing `:::` as a
  following paragraph, which `react-markdown` renders as literal text. All four
  `trade-off` blocks in the course (1.2, 1.3, 1.4, 1.5) leaked it; a corpus render
  through the real lesson pipeline now reports 0, with open fences equal to block
  count at 109. Fixed in the parser, not the content, because the closing fence is
  intentional and the plugin already tolerates the same fence in its other shape
  (`tableCellsToRow:94`). #582.
- **The voice guide's banned phrases were unenforced on content.** Not a drift
  finding, a structural one: `eslint.config.mjs:15-21` puts the markdown, MDX and
  JSON globs in a global `ignores`, which flat config applies before any `files`
  matcher, so the `no-restricted-syntax` voice rule at `:133-147` can never see a
  lesson even though it lists `**/*.md` and `docs/voice-guide.md:35` credited it for
  content. Measured 94 phrases out of the guide against all 45 lessons plus the quiz
  bank: 2 live violations, both fixed, and the three phrases ESLint does ban scored
  zero content hits (#586). Before that, #585 removed the 37 em dashes in the quiz
  bank, the one published surface that broke the guide's em-dash rule while all 45
  lesson files already carried none.
- **Every lesson's Quick check answer against the lesson that claims to justify it**
  (all 45 lessons, two independent readers, split as modules -1 to 5 and 6 to 11; the
  second pass itemised 46 separate answer items across its 20 lessons). Four real
  defects, all merged, and none of them a wrong verdict:
  1. `6.1:49` defined Fixed Bids as taking "No adjustments based on placement or
     conversion likelihood", which the same lesson denies at `:58`, `:73`, `:108` and
     `:209`, and which `6.2`'s entire multiplier math contradicts. `6.1:218` answer (1)
     then told the learner "Dynamic Down Only guarantees your bid ceiling" while the
     table at `:120` scores Fixed and Down Only identically on that axis, and answers
     (3) and (4) of the same block name both strategies. #587.
  2. `7.3:127` computed `spend x ACoS` and called the result waste: "A 50% ACoS on
     ₱5,000 of spend wastes ₱2,500". The course defines `ACoS = ad spend ÷ ad sales ×
     100` at `1.3:21`, so multiplying spend by the ratio names no quantity the course
     uses, and under the lesson's own reading the spend already is the ₱5,000. The
     figures were right and the label was wrong: read as ad sales, 0.50 x ₱5,000 is
     ₱2,500 of spend. #588.
  3. `2.4:168`, in the Common Mistakes table, sold theme separation as the way to
     "optimize ad copy ... per theme", which the same lesson rules out at `:23`,
     `:187`, `:207` and its own fact card `:224`/`:225`. #589.
  4. `7.2:95` answered a zero-orders question "Yes" on the numbers alone, dropping the
     relevance test that `7.2:17`, the `:38` routing table and the `:57` exercise all
     make the discriminator; and `4.4:165` added "with budget reviewed throughout" to
     the build order, a clause the lesson never states and whose own Step 6 puts
     budget last. A doubled expansion, "good CVR conversion rate" at `7.2:38`, turned up
     while quoting that routing table and is the only instance of that shape in the
     course. #591.
- **A title-length number Module 3 refuses to give.** `-1.2:86` told a zero-knowledge
  learner "Amazon's rules cap it at 200 characters" and `3.1:97` printed "200 chars" in
  a comparison table, while `3.2` states five times that the limit "varies by category
  and change[s] over time" and must be checked in Seller Central, at `:50`, `:178`,
  `:190`, its answer key `:229` and fact card `:240`. Both numbers removed rather than
  replaced, because the course's own position is that the number is not knowable in the
  abstract. #590. After this the only remaining hard length in `content/curriculum/` is
  `3.2:186` "Backend search terms filled (250 characters, no commas)", a different
  field that no lesson retracts.
- **Overlapping numeric ladders, a negative result worth recording.** A scanner written
  to hunt the boundary-overlap class #565 fixed in `9.3` reported 13 candidates across
  the corpus. All 13 were the scanner's fault: it treated adjacent columns of a
  comparison table as a sequence of ranges, and it modelled "Under 10" as inclusive of
  10. No second instance of the bug class exists. The scanner was discarded rather than
  shipped, because a gate that fires only on false positives is worse than no gate.

## Rejected a fix

Module 0 Q2 asks "Which Amazon ad type appears within search results and on product
detail pages?" The audit proposed narrowing the stem with "promoting an individual
listing" as the discriminator. That is not safe to add: Sponsored Display
product-portrait ads also promote a single ASIN and can surface in search results, so
the proposed wording would leave two defensible answers where one is keyed. The stem
needs a placement fact the course teaches nowhere, which is a call for the content
owner rather than a correction. Left exactly as it is.

## Also open from these passes, needs a decision

Measured and not edited, because each has two defensible resolutions and choosing
between them changes what the course teaches. The older open items above still stand;
these are new and do not duplicate them.

- `8.3:32` and the heading `8.3:38` both call the weekly competitive review a
  30-minute job, while the cadence table in the same lesson gives Weekly 10 min at
  `:49` and reserves 30 min for the Quarterly deep dive at `:54`. The table's ladder
  (2 / 10 / 15 / 30) reads as the considered artifact, but "The 30-Minute Weekly
  Review" is a named entry in
  `docs/superpowers/lesson-enrichment-inventory.json:1052` and
  `docs/superpowers/lesson-enrichment-blueprint.md:108`, so renaming it edits a design
  record as well as a lesson.
- `5.2:126`-`:130` sets bid multipliers by part of day ("Morning (6-9AM): commuters
  browsing on mobile", "Evening (7-11PM): peak shopping time") with no timezone
  anywhere in the list, while `:134` says the peak window is 8PM-12AM PHT, which it
  glosses as 7AM-11AM EST. Under a US-shopping reading the list and the sentence are
  opposites; under a Philippine-clock reading the morning row describes commuters who
  are not the buyers. The Quick check answer at `:246` quietly picks the PHT reading.
- `4.4` numbers Step 5 "Add negative keywords last" at `:84` and then has a Step 6 at
  `:86`. #591 removed the invented clause from the answer and left the step titles
  alone, because whether budget review belongs inside the "last" claim is the same
  teaching question.
- `1.1:167` has a `## Check` section with five learner-facing questions and no answer
  key anywhere in the file, and `0.1` has no Quick check at all. The heading style is
  split: `0.3`, `1.1` and `1.5` use `## Check` while the other 20 lessons use
  `## Quick check`. Writing the missing key means authoring five answers, which is
  content rather than correction.
- `0.2:117`'s answer rules the Home section out as "not the place where the lesson,
  simulator, or payment record lives", while the tour table at `:25` grants that Home
  shows "what to do next", and the question it answers is not inside that section at
  all. Weakest finding in the set, and left alone on purpose.

## Unverified source citations, needs a person with Amazon access

29 lessons print an "Official source URL" line. 16 of those 29 hedge it. 13 say the specific article is "not
verified", 3 present the URL as only an "entry point" behind a login, and `3.3` sits in the second group while
also labelling its own 5-17% and 8-20% lift figures as seller-reported:

`0.1`, `1.1`, `1.3`, `1.4`, `2.1`, `2.2`, `2.3`, `2.4`, `3.3`, `4.1`, `4.2`, `4.3`, `6.2`, `7.2`, `8.1`, `8.3`.

`pnpm check:curriculum-sources` measures the related gap and reports a sharper number than "some lessons hedge":
of the 45 lessons, 29 carry a fact card with a `Last verified` line and **none of the 29 has a date** (`0 dated,
29 pending text, 0 bracket todo, 16 no field`, after #576). The script only fails CI on a dead link, so this is a
report a person has to read rather than a red build.

Two follow-ups came out of reading it. Seven of the 30 fact cards, spread over six lessons because one lesson
carries two, were rendering literal editing scaffolding to learners: `Last verified: [content owner to fill in at
rewrite time]` and `Owner: [content owner]`, while the rest already used plain wording with the owner named. #576
normalized those seven, and the per-lesson count of cards awaiting a date stayed exactly 29 both before and
after, so nothing was hidden. Separately, the report grouped four correctly-unsourced cards with genuinely blank
ones: `0.2` describes this app, `1.5` is labelled a teaching heuristic, `3.1` says its metric is an inference and
not a documented Amazon metric, and `3.2` says listing limits are category-specific with no single page. #577
split those into "states why", so the report stops implying that the fix for any of them is a link.

What remains here is entirely for a person with Amazon access: the 29 dates, and the specific articles behind the
hedges above. It is not closeable from here: the pages
sit inside login-gated Seller Central help, and writing an invented article URL into a lesson would be worse
than the honest "not verified" that is there now. `3.3` is the sharpest case, because it already concedes that
no official source backs the 5-17% and 8-20% lift claims.

## The lesson-to-tool bridge is validated and never shown

`content/curriculum/inventory.json` carries a `toolBridge` for each lesson and five point at a simulator:
`2.2` to keyword-research, `3.1` to listing-audit, `4.4` to campaign-builder, `6.3` to bid-elevator, `7.3` to
str-triage. `scripts/validate-tool-bridges.ts` checks those mappings and the learning-release gate runs it,
but no file under `src/app`, `src/components`, `src/composition` or `src/infra` mentions `toolBridge`,
`CurriculumInventory` or `inventory.json`. Read together with the link finding above, a lesson that tells the
learner to open the Search Term Triage tool provides no clickable way to do it, while the data needed to
build that link already exists and is already validated on every release.

Two sibling fields in the same records are worth measuring before deciding what to surface, because they are
not equal. `finalDeliverable` is populated on **45 of 45** lessons with a concrete artifact sentence: "A written
Amazon PPC work goal" for `0.1`, "A first client-brief decision note" for `0.3`, "A one-line decision note" for
`1.1`. It reaches no learner: `git grep` for `finalDeliverable` finds only the parser in
`src/domain/curriculum/CurriculumInventory.ts` and its unit test, and it appears in no Prisma model, no `Lesson`
entity, no repository, and not in `scripts/seed-all-content.mjs`, so it never even enters the database. A learner
who finishes a lesson is never told what the lesson intended them to produce, while that sentence is authored,
release-gated and discarded.

`resourceRefs` is the opposite and should not be treated as a lost dataset: all 45 are the single value
`mdx:<the same lesson's own slug>`, a self-pointer carrying nothing beyond what the row already knows. The
count is honest only for `finalDeliverable`.

The practical note for the open decision below is that both findings point at the same missing surface. A footer
block on the lesson page showing the deliverable sentence, and the tool link where one exists, would consume two
validated datasets in one change. Whether that belongs on the most-viewed surface is still a product call.

This is the fourth instance of a pattern worth naming: email templates, progress events, the glossary
popover, and now the curriculum inventory. A port, dataset or adapter is real, unit tested, and wired into a
script or a gate, and nothing in the UI ever reaches it. Checking whether a thing is *consumed* takes one
grep and keeps coming out differently than checking whether it exists.

## Two measurements that are not defects, but change a decision

**The stored 70% pass threshold is never the bar a learner actually faces.**
`content/curriculum/quiz-questions.json` carries `_meta.passThreshold: 70`, the seeder writes it to each quiz's
`passingScore`, and `src/domain/entities/QuizAttempt.ts:153-154` scores with
`Math.round((correctCount / totalQuestions) * 100)` then compares `score >= quiz.passingScore`. Because questions
are whole, the achievable score jumps past 70 rather than landing on it, so no module quiz can be passed at
exactly 70%:

| questions | must get | real bar | modules |
| --- | --- | --- | --- |
| 4 | 3 | 75% | -1, 9, 10, 11 |
| 5 | 4 | **80%** | 0 |
| 7 | 5 | 71.4% | 5, 6 |
| 8 | 6 | 75% | 2, 3, 4, 7, 8 |
| 12 | 9 | 75% | 1 |

Module 0, the first quiz a learner meets, is the strictest at 4 of 5. No quiz requires perfection, which was the
thing worth ruling out. Nothing learner-facing prints a percentage, `passingScore` appears only in the admin quiz
forms, so there is no visible contradiction to fix and no change is proposed. Recorded because adding or removing
a question silently moves that module's bar without anyone editing a threshold, and because
`content/CURRICULUM-INDEX.md:184` tells the content owner "the pass threshold is 70%".

**The cost of surfacing the tool bridge is one string.** The open decision above is whether to link lessons to
simulators. Each bridge record is `{ "kind": "simulator", "target": "<id>" }`, parsed as a typed union in
`src/domain/curriculum/CurriculumInventory.ts:10-11`, and all five targets map one to one onto directories that
already exist under `src/app/tools/`: `keyword-research`, `listing-audit`, `campaign-builder`, `bid-elevator`,
`str-triage`. So the link is `/tools/${target}`, and the work is a render addition on the lesson page rather than
a redesign or a new route. That is the cost side; whether the most-viewed surface should carry the link is still
a product call.

## How to work through this list again

The recomputations are cheap to reproduce. A read-only agent briefed with the scope, the ratio
definitions, and the instruction to report only what the printed numbers themselves contradict,
returns a list like this one in a single pass. All four passes used that shape, and it is worth reusing
after any future currency or figure change, including a pass pointed at one module rather than a whole
band of them.
