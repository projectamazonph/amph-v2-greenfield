# STORY-102 — Course detail zero-meta + voice fixes

**Sprint:** 16 follow-up
**Points:** 1
**Epic:** Catalog
**Owner:** TBD
**Status:** Done

## Goal

Three follow-up fixes to the `/courses` catalog surface, found by a
2026-08-05 audit of `https://projectamazonph.vercel.app` after
STORY-101 shipped:

1. The course detail page at `/courses/[slug]` rendered a bare
   `0 lessons · ≈ 0 hours` for the `Ultimate Transformation` tier.
   Same root cause as STORY-101 bug #1, on a different page: the
   meta block didn't guard on `totalLessonCount > 0`, and the
   `Math.ceil(... * 0.5)` "≈ hours" computation returned 0 for tiers
   with no lessons. The detail page now branches on
   `totalLessonCount > 0` and shows `Live cohort + 1:1 review` for
   live tiers, hiding the hours line and the video duration.
2. `LessonContent.tsx` rendered the QUIZ card title as
   `Knowledge check`. Not on the explicit banned list in
   `docs/voice-guide.md`, but reads AI-slop ("knowledge check" is a
   common ChatGPT / corporate-LMS tell). Replaced with `Quick check`
   — direct, describes the action, matches the voice rule "say what
   it does, not what it represents."
3. `QuizPlayer.tsx` had the same `Knowledge check` kicker on the
   standalone quiz player. Replaced with `Quick check` for the same
   reason.

## Scope (what this story ships)

- `src/app/courses/[slug]/page.tsx`
  - The header `meta` block branches on `totalLessonCount > 0`. Tiers
    with no on-demand lessons show `Live cohort + 1:1 review` instead
    of `0 lessons · ≈ 0 hours`. The hours and video-duration lines
    are gated on the same condition, so they don't render for live
    tiers.

- `src/app/courses/[slug]/lessons/LessonContent.tsx`
  - QUIZ card title: `Knowledge check` → `Quick check`.

- `src/components/courses/QuizPlayer.tsx`
  - Standalone quiz player kicker: `Knowledge check` → `Quick check`.

- `src/app/courses/[slug]/__tests__/page.test.ts`
  - Adds a "header meta for live-cohort tiers" describe block asserting
    the page branches on `totalLessonCount > 0`, shows the `Live cohort`
    label, and does not run the `Math.ceil` hours computation in the
    zero-lesson branch.

- `src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx`
  - Adds an assertion that QUIZ lessons render `Quick check`, not
    `Knowledge check`.

- `src/components/courses/__tests__/QuizPlayer.test.ts` (new file)
  - Static-source regression guard. QuizPlayer is a client component
    using `useState` + `fetch`, so a render-based test needs jsdom +
    `@testing-library/react` which the project does not ship at this
    layer. The grep-style guard matches the pattern already used in
    `src/app/courses/__tests__/courses-page.test.ts` (SOLID regression
    guard).

## Verification

- `pnpm tsc --noEmit` — zero type errors.
- `pnpm lint` — zero ESLint errors.
- `pnpm test` — 3,705 tests pass, 0 fail, 2 pre-existing skipped.
- Manual: open `/courses/ultimate-transformation` in a browser, confirm
  the header meta now reads `Live cohort + 1:1 review` and the hours
  line is gone. Open any QUIZ lesson (none in current seed, but the
  test asserts the copy).

## Out of scope

- No DB change. The `ultimate-transformation` course still has zero
  modules / zero lessons in the Module+Lesson tables. The fix is
  presentation only.
- No rename of the `Knowledge check` strings in JSDoc comments
  (e.g. `IQuizRepository.ts` line 42) — those are internal docs, not
  user-facing copy.
