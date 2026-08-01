# STORY-094 — Lesson-to-quiz transition wiring

**Type:** fix
**Pts:** 1
**Status:** Planned → Done (with this PR)

## Why

STORY-026 marked the lesson page complete, but the `QUIZ` content type rendered only an "Interactive quiz — coming soon!" placeholder. Every quiz lesson dead-ended for students. The actual quiz route (`/courses/[slug]/lessons/[lessonId]/quiz`) and use case existed, but `LessonContent.tsx` never linked to it.

The audit in `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` listed this as the #1 student-facing gap (P1, visible to every student on day one).

## What changed

- `src/app/courses/[slug]/lessons/LessonContent.tsx`
  - Removed stale local types that did not match the domain `Lesson` shape.
  - Imported the domain `QuizContent`, `VideoContent`, `TextContent` from `@/domain/entities/Lesson`.
  - Replaced the "coming soon" placeholder with a real quiz card that:
    - shows the question count (singular/plural)
    - previews the first two questions with numbering
    - shows a "more" summary line for any remaining questions
    - exposes a `Start Quiz →` link to `/courses/[slug]/lessons/[lessonId]/quiz`

- `src/app/courses/[slug]/lessons/LessonContent.module.css`
  - Renamed `.quizPlaceholder` → `.quizCard`; dropped the dashed border in favour of a solid token-coloured card.
  - Added `.quizSubtitle`, `.quizMeta`, `.quizMetaItem`, `.quizQuestionsList`, `.quizQuestionItem`, `.quizQuestionNumber`, `.quizQuestionPrompt` styles. All use design tokens (`var(--space-*)`, `var(--accent)`, `var(--surface-*)`).

- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`
  - `<LessonContent>` now receives `courseSlug` as a prop so it can compute the quiz href.

- `src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx` (new)
  - Locks in the new shape: TEXT renders through react-markdown, VIDEO gets the YouTube embed, QUIZ produces the CTA + question preview, and the "coming soon" placeholder text is gone.
  - Single-question and plural-question wording are covered.
  - The full five-question case shows a "+N more" summary after previewing the first two.

## Acceptance Criteria

- [x] A QUIZ lesson page shows a "Start Quiz" CTA pointing at `/courses/[slug]/lessons/[lessonId]/quiz`.
- [x] The CTA replaces the previous "Interactive quiz, coming soon!" text.
- [x] For a 1-question quiz the card reads "1 question in this lesson".
- [x] For a multi-question quiz the card shows the first two prompts and a "+N more" summary.
- [x] Tests cover TEXT, VIDEO, QUIZ, malformed-content, singular-question, plural-question paths.

## Files touched

- `src/app/courses/[slug]/lessons/LessonContent.tsx` (rewritten)
- `src/app/courses/[slug]/lessons/LessonContent.module.css` (style additions)
- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` (one-line prop pass)
- `src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx` (new)
- `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` (this gap is now closed)

## Pitfalls

- The old `LessonContent.tsx` declared `TextLessonContent / VideoLessonContent / QuizLessonContent` locally. These did not match the domain `VideoContent / TextContent / QuizContent` (the local `QuizLessonContent` had `title: string` instead of `questions[]`). I deleted the local types and used the domain types directly, which prevents the next drift.
- The Lesson `content` was cast to `unknown` first because TypeScript's narrowing across discriminated unions is fragile for serialized JSON. The `isQuizContent` / `isVideoContent` / `isTextContent` helpers check the actual property shape, not just `lesson.type === "QUIZ"`, so the component won't render a quiz preview for a lesson whose content is malformed.

## Verification

- `pnpm test src/app/courses/[slug]/lessons/__tests__/LessonContent.test.tsx` — 6 tests, all green.
- `pnpm tsc --noEmit` — 0 errors.
- Manual: open a QUIZ lesson, confirm "Knowledge check" card appears with question count, two prompts, and the "Start Quiz" CTA pointing to `/courses/{slug}/lessons/{id}/quiz`.

## Follow-ups

- The 64-of-64 loading-skeleton coverage target still leaves `[slug]/lessons/[lessonId]/quiz/loading.tsx` as the only quiz sub-route skeleton — verified existing.
- The audit's simulator-ownership and session-revocation items were already fixed in source. STORY-094 is purely the quiz transition.