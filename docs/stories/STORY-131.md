# STORY-131: LEARN-013 — Just-in-time glossary tooltips

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-013)

**Owner:** Ryan

**Status:** Planned.

## Context

This story opens LEARN-013 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Module 0 lessons already
spell out acronyms in parentheses (for example, "ACoS (Advertising
Cost of Sales)"). The build plan calls for a just-in-time glossary
component so a learner can look up a term on tap without leaving the
lesson. The glossary must keep plain MDX readable when JavaScript is
unavailable.

## Goal

Add an MDX directive `:::term{id="slug"}text:::glossary` that renders
a button-styled inline term. On keyboard or touch, the term opens a
popover with the plain-language definition from the reviewed
glossary. The directive plugin parses the term slug, the renderer
binds the popover to the glossary data, and the fallback when
JavaScript is disabled keeps the parenthesised definition visible
inside the lesson body.

## Scope

- Add `content/curriculum/glossary.json` with the seven terms the
  Module 0 lessons already spell out (ACoS, TACoS, ROAS, CPC, CTR,
  conversion rate, PPC). Each entry has `slug`, `term`, `shortDefinition`,
  and `longDefinition`.
- Add a `term` directive to `src/lib/mdx/directive-plugin.ts` that
  emits `<button data-amph-term="slug">text</button>` so the renderer
  can wire the popover.
- Add `src/components/lesson/GlossaryTerm.tsx` that hydrates the
  button with a focus and click popover using only AMPH tokens.
- Wire the renderer in `src/app/courses/[slug]/lessons/LessonContent.tsx`
  so a `[data-amph-term]` element becomes a `GlossaryTerm`.
- Keep plain MDX readable: the directive body text is the term name,
  and the inline parenthesised definition the lesson already carries
  remains the no-JavaScript fallback.
- Six Vitest tests cover the directive parser, the glossary loader,
  and the popover wiring. No new domain entity is required.

## Acceptance criteria

- [ ] `:::term{id="acos"}ACoS:::` in any lesson MDX renders as a
      button that opens the ACoS definition on click and on focus.
- [ ] `pnpm validate:lesson-production` reports every Module 0 lesson
      as still passing the production schema; the new directive is
      recognised by the validator.
- [ ] Plain MDX remains readable when JavaScript is unavailable: the
      lesson text shows the parenthesised definition the author
      already wrote.
- [ ] The glossary loader is a pure function (`@/lib/glossary`) and
      has its own Vitest tests.
- [ ] Typecheck, lint, unit, architecture, build, E2E, and Lighthouse
      checks are required in CI.

## Non-goals

- A separate `/glossary` index page. The glossary data file is the
  source of truth; an index page can be added in a later story.
- Translations. Definitions are English-only.
- Linking the glossary to the simulator attempt feedback or to the
  help route. Each is a later story.

## Dependencies

- LEARN-001 (STORY-111, STORY-129): the curriculum inventory is the
  source of truth and validates that the new directive is recognised
  in the lesson production schema.

## Verification

- Unit tests cover the directive parser, the glossary loader, and the
  popover wiring.
- The validator `pnpm validate:lesson-production -- --strict` exits 0
  for every Module 0 lesson.
- Manual smoke: open a Module 0 lesson, click the term, confirm the
  popover text matches `glossary.json`.
