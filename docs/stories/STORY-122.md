# STORY-122: Active lesson primitives — visual and interactive blocks for Module 1

**Sprint:** Learning experience uplift, wave 3

**Points:** 8

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress on `feat/active-lesson-primitives`. Component primitives, directive plugin, validator, and Module 1 application are committed. Section 5.3 validator rules (fence IDs, SelfCheck shape, em-dash check inside blocks, `--strict` mode) ship with `pnpm validate:lesson-production`. PR not yet opened.

> **Historical snapshot.** This story describes the original 31-lesson visual-primitives tranche. The current curriculum has 42 lessons and additional native directives; use `docs/CURRICULUM-SYNC-SPEC.md` and `content/README.md` for the active authoring contract.

## Goal

Replace passive read-only prose in Module 1 lessons with one interactive primitive
(`SelfCheck`) and three visual primitives (`TradeOffTable`, `ProcessDiagram`,
`PitfallCallout`). Honor the existing lesson production contract: outcome, decision,
worked example, active attempt, feedback, evidence, retrieval cue. No new domain
entity, no new tier, no new simulator, no grading or persistence.

## Source

`docs/superpowers/specs/2026-08-19-active-lesson-primitives-design.md`
(`## 4. Primitives`, `## 5. Authoring contract`).

## Scope

- `src/components/lesson/SelfCheck.tsx` plus `.module.css` — interactive
  radio-group pattern, feedback on selection, `Try again` resets state. No
  `useEffect`, no `localStorage`, no grading call.
- `src/components/lesson/TradeOffTable.tsx` — native `<table>` with `<caption>`
  and `<th scope="col">` for the rectangular form, `<th scope="row">` for the
  key/value pairs form. Horizontal scroll on narrow viewports.
- `src/components/lesson/ProcessDiagram.tsx` — semantic `<ol>` rendering of
  pipe-delimited steps with optional hint and Phosphor icon slot.
- `src/components/lesson/PitfallCallout.tsx` — `<aside role="note">` with
  `info | warning | pitfall` variants, Phosphor icon decorative.
- `src/components/lesson/index.ts` barrel and `__tests__/` (a11y, behavior).
- `src/lib/mdx/directive-plugin.ts` — small remark-style plugin that converts
  `:::trade-off{...}`, `:::process{...}`, `:::callout{...}` fences into
  renderable blocks without a new `package.json` entry.
- `src/app/courses/[slug]/lessons/LessonContent.tsx` extended to render the new
  blocks through the existing react-markdown pipeline.

## Acceptance criteria

- All four components render via `src/app/courses/[slug]/lessons/LessonContent.tsx`
  with WCAG AA contrast, keyboard nav on `SelfCheck`, and decorative icons.
- The directive plugin parses the three fences; malformed fences produce a
  clear console error.
- `<SelfCheck ... />` JSX renders through react-markdown without editing the
  pipeline's `components` map beyond adding the new component name.
- `pnpm validate:lesson-production --strict` exits 0 on every Module 1 lesson.
- `pnpm tsc --noEmit` and `pnpm lint` pass.
- A11y unit suite under `src/components/lesson/__tests__/` passes via jest-axe.

## Out of scope

- No new `Lesson.type`, no new port method, no new domain entity.
- No analytics on `SelfCheck` (LEARN-060 follow-up).
- No persistence of self-check answers (per the design's confirmation).
- Modules 0 and 2-8 application (deferred to STORY-128 series).

## Verification

- `pnpm test` passes with the new unit tests.
- `pnpm tsc --noEmit` clean.
- `pnpm lint` clean.
- `pnpm validate:lesson-production --strict` exits 0 on all 31 lessons.
- Manual: open lesson 1.5 with an enrolled test student, complete a `<SelfCheck>`
  and confirm the round-trip works without persistence.
