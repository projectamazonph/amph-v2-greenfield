# STORY-133: LEARN-015 — Onboarding completion view

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-015)

**Owner:** Ryan

**Status:** Shipped via PR #524 (commit `0d46987d`, 2026-09-16). This story
doc is the only stale surface; CHANGELOG.md (line 146), FEATURES.md
(line 143), and `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` already record
the closure. Closed in PR #TBD with a doc-hygiene commit on
2026-10-08.

## Context

This story opens LEARN-015 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Today a learner who
finishes Module 0 lands back on the dashboard with no plain-language
summary of what they just completed, what is next, or where to get
help. The build plan calls for a one-screen confirmation that names
the next lesson in plain language and links to it.

## Goal

Add a dedicated onboarding completion route at
`/dashboard/onboarding-complete` that renders for any logged-in
learner. If the learner has finished every Module 0 lesson, the page
shows the plain-language pathway summary, the next action link to
the first Module 1 lesson, the expected time for Module 1, and a
where-to-get-help link. If the learner has not finished Module 0,
the page redirects to the dashboard with a plain-language
explanation.

## Scope

### Shipped (PR #524, commit `0d46987d`)

- `src/app/dashboard/onboarding-complete/page.tsx`: auth-gated server
  component. Calls `requireAuth()`, reads the PPC Foundations
  enrollment via `container.enrollmentRepo.findByUserId`, reads the
  published catalog via `container.getCatalogCourse.execute`, runs
  the pure helper, and either renders the four-section summary or
  `redirect()`s back to `/dashboard` with a plain-language query
  string.
- `src/app/dashboard/onboarding-complete/loading.tsx`: five
  `SkeletonCard` lines (heading, intro, three body cards, two
  footer lines) per the 64/64 loading-skeleton coverage target.
- `src/app/dashboard/onboarding-complete/page.module.css`: the
  AMPH navy-shell page styles (header, intro, sectionHeading, primary
  action button, secondary action, footer).
- `src/lib/onboardingComplete.ts`: pure helper. Discriminated
  `OnboardingStatus` union with `complete | missing_module_zero |
  module_zero_incomplete | no_next_module`. Module 0 is identified
  by the smallest `moduleNumber`; the helper sorts modules, sorts
  the next module's lessons by `displayOrder`, and reduces the
  estimated minutes for the expected-time copy.
- `src/lib/__tests__/onboardingComplete.test.ts`: five Vitest cases
  (empty modules, partial completion, full completion, no Module 1,
  out-of-order module numbers).
- `FEATURES.md` (line 143) lists the onboarding completion view in
  the Wave 1 zero-to-one onboarding arc.
- `CHANGELOG.md` (line 146) records the LEARN-015 entry under
  "2026-09-16: Learning-experience 8.5 Wave 1 closed + P3-83
  drag-and-drop (PRs #519-#526)".
- `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` line 3 names
  `onboarding-complete` among the 2026-09-16 Wave 1 closures.

### Deferred

- A persistent event log for onboarding completion. The XP and
  badge systems already record lesson completion via
  `markLessonCompleteAction`; this route is a celebration surface
  only. LEARN-060 (privacy-safe learning events) owns any future
  onboarding-completion telemetry.

## Acceptance criteria

- [x] An unauthenticated visitor to `/dashboard/onboarding-complete`
      is redirected to `/login`. `requireAuth()` in
      `src/app/dashboard/onboarding-complete/page.tsx:25`.
- [x] A learner who has not finished Module 0 is redirected to
      `/dashboard` with a plain-language explanation. The
      `module_zero_incomplete` and `missing_module_zero` branches
      in `src/lib/onboardingComplete.ts:57-64` and the
      corresponding `redirect()` calls in
      `src/app/dashboard/onboarding-complete/page.tsx:58-68`.
- [x] A learner who has finished Module 0 sees the four sections in
      plain language. The four `Card` blocks in
      `src/app/dashboard/onboarding-complete/page.tsx:82-120`
      render pathway summary, next action, expected time, and the
      help link.
- [x] The "Continue to Module 1" button links to the first Module 1
      lesson. `Link href={/courses/${slug}/lessons/${status.nextLesson.id}}`
      in `src/app/dashboard/onboarding-complete/page.tsx:96-101`,
      where `status.nextLesson` is the smallest-`displayOrder`
      lesson of the next module resolved in
      `src/lib/onboardingComplete.ts:71-75`.
- [x] The page never implies the learner is now job-ready or
      certified. No copy on the page uses "certified", "hiring
      ready", "qualified", or "badge". The XP and badge systems
      already record lesson completion; this route only renders
      the next-action link.
- [x] Typecheck, lint, unit, architecture, build, E2E, and
      Lighthouse checks are required in CI. All ten CI checks
      (typecheck, architecture, unit, e2e, build, lighthouse,
      learning gate, vercel) pass on `main` at commit `6c45b96e`
      per the most recent verify (PR #670).

## Non-goals

- A persistent event log. LEARN-060 owns privacy-safe learning
  events.
- Awarding a Module 0 completion badge. The existing XP and badge
  systems already record lesson completion; this is a celebration
  surface, not a new state transition.

## Dependencies

- LEARN-014 (STORY-132): the onboarding completion view shares the
  same plain-language voice and the same requireAuth gate.
  STORY-132 shipped in PR #523 (commit `bc9307ad`, 2026-09-16); see
  `docs/stories/STORY-132.md`.

## Verification

- Manual smoke: sign in, complete every Module 0 lesson, open
  `/dashboard/onboarding-complete`, confirm the four sections render
  and the Module 1 link works. The pure-helper Vitest suite in
  `src/lib/__tests__/onboardingComplete.test.ts` covers the five
  onboarding-status branches (missing module, partial completion,
  full completion, no next module, out-of-order module numbers);
  all five are green on `main` at commit `6c45b96e`.
