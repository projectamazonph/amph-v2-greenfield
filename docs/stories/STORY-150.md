# STORY-150 — Put the quiz bank and the last lesson leftovers in pesos

**Sprint:** Learning experience uplift, content correctness
**Points:** 2
**Epic:** Lesson delivery
**Owner:** Ryan
**Status:** In review

## Goal

The module knowledge checks price every scenario in Philippine pesos at realistic
magnitudes, and no lesson still states money in dollars after STORY-149 scaled the
worked examples.

## Context

STORY-149 fixed the lesson bodies and explicitly left the quiz bank out of scope. The
bank is the other half of the same problem. A learner works through lesson `6.2`, which
takes a ₱50 base bid through a +50% placement adjustment to ₱75 and a stacked
₱50 × 2.0 × 10.0 to ₱1,000, then opens the Module 6 quiz and is asked the same two
questions about a `$1.00` base bid. Identical arithmetic, different currency, a screen
apart.

`content/curriculum/quiz-questions.json` held **52 dollar amounts across 32 fields in 11
questions**, in modules 1, 2, 3, 4, 6 and 7. Converted at the course's ₱50 per US$1
convention, five of those questions land exactly on figures the lessons already teach:

| Quiz question | Was | Now | The lesson already says |
| --- | --- | --- | --- |
| 6 / q2 | `$1.00` bid, +50% | ₱50 bid, ₱75 | `6.2` worked example: base ₱50, +50%, ₱75 |
| 6 / q6 | `$1.00 × 2.0 × 10.0 = $20.00` | ₱50 × 2.0 × 10.0 = ₱1,000 | `6.2` worst case, and its SelfCheck `sc-6-2` |
| 6 / q5 | `$2.50` CPC, `$30` price | ₱125 CPC, ₱1,500 price | `6.3` market band ₱60 to ₱125, `6.3` product price ₱1,500 |
| 4 / q7 | `$1.10` exact, `$0.35` broad | ₱55 exact, ₱18 broad | `4.3` garlic press example, ₱55 and ₱18 |
| 1 / q12 | `$0.90` to `$1.30` range, `$0.60` max | ₱45 to ₱65, ₱30 | the same ceiling-versus-market shape as `1.2` |

The remaining six (1 / q1, q3 and q6, 2 / q2, 3 / q2 and 7 / q4) carry no figure a lesson
states verbatim, so they were scaled and every ratio inside them recomputed.

Two of the 34 edited strings had no `$` to find: module 1 option "You get 4 clicks for
every dollar spent", and module 3's explanation "Sales per ad dollar scales with CVR
divided by CPC", which named the CPCs as bare numbers. Both needed the wording changed,
not the symbol.

The bank is consumed only by `scripts/seed-all-content.mjs`, which deletes a quiz's
existing questions and recreates them on each run, so a corrected file reaches learners on
the next seed without a migration.

Separately, the scan STORY-149 ran looked for amounts that were already carrying a peso
sign, so anything still written with a literal `$` was invisible to it. A rescan found
four such leftovers plus one lesson title.

## Changes

### Quiz bank (`content/curriculum/quiz-questions.json`)

- 32 fields converted across the 11 affected questions. Question order, option order,
  JSON key order and every `correctAnswer` letter are untouched, checked field by field
  against a pre-edit copy of the file.
- Two more strings the `$` pattern could not reach, because they spelled the currency out
  rather than using the symbol: module 1 / q6 option "You get 4 clicks for every dollar
  spent", and module 3 / q2's explanation "Sales per ad dollar scales with CVR divided by
  CPC", which named the two CPCs as bare numbers.

Every ratio a converted question depends on was recomputed from the converted inputs, and
the answer the bank marks correct is still the answer that comes out:

| Question | Inputs became | Recomputation |
| --- | --- | --- |
| 1 / q1 | ₱10,000 spend, 160 clicks | ₱10,000 ÷ 160 = ₱62.50, which is option B, the marked answer |
| 1 / q3 | ₱25 per ₱100 of revenue | 25 ÷ 100 = 25% ACoS, the percentage the explanation states |
| 1 / q6 | ₱4 revenue per ₱1 spend | ratio unchanged, still the inverse of a 25% ACoS |
| 1 / q12 | ₱45 to ₱65 market, ₱30 ceiling | ceiling still sits below the whole market band |
| 2 / q2 | ₱7,500 spend, "under ₱10,000" | 200 clicks × ₱37.50 = ₱7,500, ACoS still undefined at ₱0 sales |
| 3 / q2 | ₱26 and ₱45 CPCs | (0.125 ÷ 26) against (0.061 ÷ 45) is still about 3.5x |
| 4 / q7 | ₱55 exact, ₱18 broad | exact still outserves broad on the same term |
| 6 / q2 | ₱50 base, +50% | ₱50 + (₱50 × 0.50) = ₱75, option B, the marked answer |
| 6 / q5 | ₱125 CPC, ₱1,500 price | ₱125 ÷ 0.08 = ₱1,562.50, which is 104.2% of ₱1,500, option C |
| 6 / q6 | ₱50 base | ₱50 × 2.0 × 10.0 = ₱1,000, option C |
| 7 / q4 | ₱175 spend | 2 clicks in 500 impressions is still a 0.4% CTR |

### Lesson leftovers

- `1.3`: the break-even formula ladder still ran on `$49.99 − $27.00`, a price pair that
  contradicts the same lesson's ₱2,500 product. Rebuilt as ₱2,500 − ₱1,350 = ₱1,150,
  which is the cost stack `1.3` already teaches, and 46% margin (₱1,150 / ₱2,500 = 0.46)
  matches the percentage the ladder concluded with before.
- `4.3`: the "how the same keyword sits in three campaigns" tree had bids of
  `$1.50/$1.20/$0.80/$0.60/$0.40/$0.35`. Now ₱75/₱60, ₱40/₱30, ₱20/₱18, so the exact,
  phrase and broad ladders keep the same ordering as the prose that follows them.
- `6.3`: the ceiling ladder ran `$40 × 8% × 25% = $0.80`, while the same lesson's worked
  example is a ₱2,500 grinder at 8% CVR that lands on a ₱40 ceiling. The ladder now reads
  ₱2,000 × 8% = ₱160, then × 25% = ₱40, which is the ceiling the lesson computes a few
  lines above it.
- `0.3`: the client-brief example's "monthly ceiling" moves from `$500` to ₱25,000.

### The 1.4 title

`1.4` is titled "Every Dollar In, How Many Dollars Back? ROAS" while every sentence under
it is priced in pesos, and a learner meets that title in the lesson navigation before any
of the body text. Renamed to "Every Peso In, How Many Pesos Back? ROAS" in the MDX
frontmatter and its six mirrors (`CURRICULUM-SYLLABUS.md`, `content/CURRICULUM-INDEX.md`,
`docs/marketing/explainer-video-prompts.md`, and the two `docs/superpowers/` inventories).
The slug `1.4-roas-measuring-return` is unchanged, so no route, bookmark or seeded lesson
reference moves.

## Out of scope

- The `Last verified` dates missing from 29 fact cards. Those need a human SME pass; the
  checker in STORY-147 reports them and nothing else should invent them.
- 16 of 45 lessons still have no fact card.
- The two curriculum overview docs disagree with the validator about what the course
  contains. `content/CURRICULUM-INDEX.md:5` says "12 modules · 42 lessons" and
  `CURRICULUM-SYLLABUS.md:340` repeats it, while `CURRICULUM-SYLLABUS.md:5` claims 443
  planned minutes. There are 13 module directories, 45 lesson files and 475 planned
  minutes, and Module -1 has no section in either document. That is a
  rebuild-from-frontmatter job rather than a currency edit, so it stays out of this story.

## Guard rail

STORY-149 fixed the numbers but left nothing behind that would notice the same mistake
again, and its own scan only looked at amounts that already carried a peso sign. The
contract now lives in `src/domain/curriculum/__tests__/CurriculumCurrency.test.ts`:

- Every lesson body, read through `NodeContentReader` with the frontmatter title
  included, is scanned for a dollar sign in front of a digit.
- `quiz-questions.json`, `diagnostic.json`, `glossary.json` and `capstone.json` are
  scanned the same way.
- A match reports the file and the offending amount, so the failure names the number to
  fix instead of only failing a comparison.

Writing the currency in words ("USD", "dollar") stays allowed, because the figure that
breaks learner arithmetic is the symbolic one. The test is chained into
`pnpm validate:learning-release`, so the Learning release gate CI job enforces it, and
`docs/runbooks/learning-release-gate.md` now says so. The test was confirmed to fail on a
temporary `$4.80` line appended to a lesson; the probe was reverted before commit.

## Verification

- A pre-edit copy of the quiz bank compared field by field against the post-edit copy: 83
  questions before and after, `correctAnswer` letters identical, key and question order
  identical, zero `$` characters left.
- Each of the 11 converted questions recomputed from its new inputs, then checked against
  the option the bank marks correct. The table above is that list.
- `pnpm validate:lesson-production`: 45/45 lessons complete.
- `pnpm validate:curriculum`: 45 lessons, 475 planned minutes, unchanged.
- `pnpm validate:learning-release`: passed, now running the currency contract alongside
  the public-claim contract.
- `pnpm typecheck`, `pnpm lint` and `pnpm test:arch` (876 checks) run clean.
- A census of every file under `content/` finds one dollar amount left: `content/README.md`
  quoting the `$0.01` mechanic that an earlier accuracy pass deleted from lesson `6.1`. It
  is a changelog entry about a removal, so it stays.

## Acceptance criteria

- [x] No quiz question, option or explanation states an amount in dollars.
- [x] Every converted ratio still computes, including the ones whose answer letters the
      bank depends on.
- [x] Question count, ordering and correct answers provably unchanged.
- [x] The four dollar figures STORY-149's peso-only scan missed are converted, and each
      agrees with the lesson text around it.
- [x] The 1.4 title is peso-denominated everywhere it appears, with the slug unchanged.
- [x] A checked-in test fails if a symbolic dollar amount returns to a lesson body or the
      quiz, diagnostic, glossary or capstone data, and that test runs in the learning
      release gate.
- [x] No new `Last verified` date invented.
