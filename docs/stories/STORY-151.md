# STORY-151 — Put the curriculum maps back in agreement with the lessons

**Sprint:** Learning experience uplift, content correctness
**Points:** 2
**Epic:** Lesson delivery
**Owner:** Ryan
**Status:** In review

## Goal

`content/CURRICULUM-INDEX.md` and `CURRICULUM-SYLLABUS.md` describe the course a learner
can actually enroll in: every lesson present, with the duration and XP the lesson itself
claims, and totals that add up. Nothing a person plans a sprint or a purchase around is
quietly a month behind.

## Context

PR #549 added Module -1 (three lessons, 28 minutes, 150 XP) and re-timed lesson 0.1 from 8
to 12 minutes. It updated `inventory.json` and `public-claims.json`, which tooling reads and
which its tests pin, and did not touch the two human-facing maps. Neither map mentions
Module -1, so both still described the 42-lesson, 12-module, 443-minute course from before
#549:

| Stated in the maps | Actual |
| --- | --- |
| 12 modules | 13 module directories |
| 42 lessons | 45 lesson files |
| 443 planned minutes | 475 |
| 3,730 total XP | 3,880 |
| Foundations: 19 lessons, 231 minutes, 1,575 XP | 22 lessons, 263 minutes, 1,725 XP |
| Module 0: ~26 minutes | ~30 |
| lesson 0.1: 8 minutes | 12 |

`FEATURES.md` repeated the same "(42 lessons, 443 planned minutes)" pair in the learning
uplift row.

`git log --format` confirms the maps were last synced as a group by #442 and #484, which is
how a content track of this size gets away from them: adding a lesson means touching the
frontmatter, the inventory and the public claims, and the prose maps are not in that set.

While checking the Module -1 lessons for their real numbers, two count claims inside the
lessons themselves turned out to contradict their own content:

- `-1.3` opens with "Describe the four levels of an Amazon ads hierarchy (account > campaign
  > ad group > keyword/target > ad)". That is five levels, the diagram below it draws five,
  the body has a `## Level 1` through `## Level 5` section, and its own takeaway says "Five
  levels". The objective line was simply wrong.
- `4.3` says "Amazon's campaign structure has three levels:" and then draws four boxes,
  starting at `Account`. The three it explains under the diagram are Campaign, Ad Group and
  Keywords, and its Quick Check answer says "Campaign, then Ad Group, then Keywords". So the
  diagram had one box too many for the sentence above it, and it read as a contradiction of
  the five-level hierarchy `-1.3` teaches one module earlier.

## Changes

### The two maps

- Both gained a Module -1 section: the index gets a five-column lesson table, the syllabus
  gets its six-column table with each lesson's own "What you can do after this lesson" line
  as the objective, and a heading with the real aggregate.
- Totals corrected in both: 13 modules, 45 lessons, 475 minutes (~7 hours 55 minutes),
  3,880 XP, and the syllabus "Current:" line to 45 across 13.
- The Foundations course row corrected in both to `-1–4`, 22 lessons, 263 minutes, and
  1,725 XP in the syllabus. Those three figures now match `public-claims.json`, which
  `PublicCurriculumClaims.test.ts` already holds against the frontmatter, so the maps and
  the purchasable course agree.
- Module 0's heading aggregate and lesson 0.1's duration corrected in both.
- The index's quiz paragraph said "12 module-final quizzes, one per module", which stopped
  being true when a thirteenth module appeared with no quiz. It now names the modules the
  quizzes cover, says Module -1 has none, and lists the per-module question counts and the
  83-question total.
- `FEATURES.md` uplift row: 42 lessons / 443 minutes corrected to 45 / 475.

### The lessons

- `-1.3`: "four levels" corrected to "five levels" in the objective line.
- `4.3`: the hierarchy diagram now starts at `Campaign`, which is what the sentence above it
  counts and what the text below it explains, and a new line says where the other two levels
  from `-1.3` sit relative to these three. The lesson's structure advice is unchanged.

## Guard rail

`src/domain/curriculum/__tests__/CurriculumDocCounts.test.ts` reads the same frontmatter the
import path reads and checks three things against both documents:

1. One table row exists per lesson, and its duration and XP match the frontmatter. Row
   numbers are read as "the two bare numbers in the row", because the two documents already
   use different column counts, and the syllabus uses six columns for Modules -1 to 8 and
   five from Module 9 on. A positional reader would have failed on that on day one.
2. The stated totals are the computed totals: the index Total line and quiz count, and the
   syllabus reading time, total XP and Current line.
3. Each syllabus module heading's lessons/minutes/XP aggregate is the real one.

It lives in the normal suite, which CI runs in the "Unit + integration" job, and is not
chained into `pnpm validate:learning-release`. That gate is for what ships to a learner;
these two files are planning maps for the people building the course, and a stale row in
them is not something a student can see.

The test was confirmed to fail on the exact drift being fixed, by temporarily restoring the
old numbers: `CURRICULUM-SYLLABUS.md is missing "**Current:** 45 lessons across 13 modules"`
and `Module 0 heading says 3/26/150 lessons/minutes/XP, frontmatter says 3/30/150`. The file
was restored from a backup afterwards and the working tree verified against `git status`.

## Out of scope

- Whether Module -1 should have its own knowledge check. Adding one changes the graded XP
  economy and the 12-quiz claim in several places, so it is an owner decision, not a docs
  fix. The maps now state the current fact: it has none.
- The `Last verified` dates missing from 29 fact cards, and the 16 lessons with no fact card
  at all. Both need the subject-matter pass that `pnpm check:curriculum-sources` reports.
- Regenerating `docs/superpowers/lesson-enrichment-inventory.json` and the visual coverage
  audit. Those are script snapshots of lesson text; their 1.4 title was updated by hand in
  #554 and the generating scripts can refresh the rest on the next run.

## Verification

- `node` census over `content/curriculum/modules`: 13 modules, 45 lessons, 475 minutes,
  3,880 XP, matching `pnpm validate:curriculum` and `public-claims.json`.
- The new doc-counts test: 3 passed. Before the doc edits it reported exactly the seven
  drifts in the table above, and it fails on each of them individually.
- `pnpm validate:lesson-production`: 45/45 lessons complete, so the `-1.3` and `4.3` body
  edits kept every required block.
- `pnpm validate:curriculum`, `pnpm validate:learning-release`: passed, unchanged counts.
- `pnpm typecheck`, `pnpm lint`, `pnpm test:arch` and the full `pnpm test` run clean.
- No new `Last verified` date invented; `STATE.md`'s own `Reviewed` field is the only date
  touched, and it records this review.

## Acceptance criteria

- [x] Both maps list all 45 lessons including Module -1, with frontmatter-true durations
      and XP.
- [x] Both maps' totals, the syllabus module headings, the Foundations course row and
      `FEATURES.md` agree with the frontmatter and with `public-claims.json`.
- [x] `-1.3` states the level count its own diagram and sections use.
- [x] `4.3`'s "three levels" sentence, diagram, explanation and quiz answer all describe the
      same three levels, and the lesson says how they relate to `-1.3`.
- [x] A checked-in test fails when the maps drift from the frontmatter again, in CI.
- [x] No invented dates and no simulator added.
