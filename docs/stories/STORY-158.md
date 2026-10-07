# STORY-158 — Lesson reader focus-mode polish

**Type:** UI/UX refinement (UI/UX-3 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/refinement` (worktree at `D:/Projects/.minimax/worktrees/uiux-refinement`)
**Canvas:** https://superdesign.dev/teams/b799fd2d-4abb-489d-9f9a-33fc85e0d291/projects/d3cd32f1-bff7-4fb1-a0b4-f0ac84b0313c
**Selected variant:** Focus Mode (`e002e434-c68f-4efd-b07c-02e4c354eb21`)

## Why

The lesson reader is the third-most-visited surface. Learners spend most of their study time
inside a single lesson page, but the in-lesson `<SelfCheck>` block currently sits as a flat
visually-ambiguous panel, and the Previous / Next buttons sit at the very bottom of the body
content — easy to miss after a long scroll, especially on the phone in a 9-hour VA shift.

The focus-mode canvas variant (draft `e002e434-…`) reframes the in-lesson interaction into
a clearer "check your understanding" card with a soft orange left border, and pins the
Previous / Next navigation as a sticky footer band so the learner never loses the path out of
a lesson. This PR implements the on-brand subset.

## In scope (this PR)

1. **SelfCheck card restyle** — keep the existing `<SelfCheck>` component logic
   (`useState` for selected answer + feedback). Restyle the wrapper into a card-style panel
   with a 3px `--c-orange-soft` left border, a small mono `CHECK YOUR UNDERSTANDING` eyebrow
   in `--c-orange-d`, and the question / options / feedback area inside the panel.
2. **Sticky Previous / Next footer band** — convert `<LessonNavButtons>` into a sticky-positioned
   band at the bottom of the viewport while a lesson is being read. Footer has a centered
   module-position label between the two buttons.

## Out of scope (deferred)

- **Sidebar width change (240 → 200 px).** Trivial CSS variable change but introduces a global
  decision about sidebar density that should be made independently of this PR.
- **Body font-size bump (32 → 40 px H1, 1.6 line-height).** Risk of layout breakage on the
  existing page.module.css; defer until DESIGN.md §4 type scale is reviewed.
- **Reading-progress rail.** The variant adds a far-right vertical progress rail driven by
  `IntersectionObserver`. Substantial new client component + wiring. Defer.
- **Executive summary box.** The variant puts a 4-line synopsis at the top of the lesson body.
  Requires new content authoring + MDX integration. Defer.

## Acceptance criteria

- [ ] `<SelfCheck>` renders with a 3px soft-orange left border, a mono eyebrow
      "CHECK YOUR UNDERSTANDING", and the question + options + feedback visually grouped.
- [ ] `<LessonNavButtons>` becomes a sticky-titled footer band at the bottom of the viewport,
      with the module-position label visible between the two buttons.
- [ ] All new copy uses verified claims only (no invented headings).
- [ ] Tokens-only CSS for any new styles.
- [ ] Accessibility: `aria-live="polite"` on the feedback region (existing); focus visible
      on the sticky buttons; reduces motion respected.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm vitest run src/components/lesson` all green.

## Files

- Modify: `src/components/lesson/SelfCheck.tsx` (markup adjustment — wrap in a new card shell)
- Modify: `src/components/lesson/SelfCheck.module.css` (card styles)
- Modify: `src/components/lesson/__tests__/SelfCheck.test.tsx` (pin the eyebrow + left border
  in the regression test)
- Modify: `src/app/courses/[slug]/lessons/LessonNavButtons.tsx` (sticky-titled footer markup)
- Modify: `src/app/courses/[slug]/lessons/LessonNavButtons.module.css` (sticky positioning)

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(lesson): …`.
- Branch ready for the user to push & open PR against `main` (or against
  `uiux/landing-conversion-polish` if stacked).
