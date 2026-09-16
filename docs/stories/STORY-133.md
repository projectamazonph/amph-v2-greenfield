# STORY-133: LEARN-015 — Onboarding completion view

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-015)

**Owner:** Ryan

**Status:** Planned.

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

- Add `src/app/dashboard/onboarding-complete/page.tsx` that requires
  auth, reads the PPC Foundations enrollment, and reads the
  published catalog.
- Use the existing `nextIncompleteLesson` helper to resolve the
  next lesson after Module 0 finishes.
- Render the four sections in plain language:
  1. Pathway summary ("You finished Module 0. Module 1 starts here.").
  2. Next action (link to the first Module 1 lesson).
  3. Expected time for Module 1.
  4. Help link (`/faq`).
- Add `loading.tsx` with the AMPH `SkeletonCard` skeleton.
- The page never grants XP, awards badges, or changes entitlement.
- Three Vitest tests cover the pure onboarding-status helper.

## Acceptance criteria

- [ ] An unauthenticated visitor to `/dashboard/onboarding-complete`
      is redirected to `/login`.
- [ ] A learner who has not finished Module 0 is redirected to
      `/dashboard` with a plain-language explanation.
- [ ] A learner who has finished Module 0 sees the four sections in
      plain language.
- [ ] The "Continue to Module 1" button links to the first Module 1
      lesson.
- [ ] The page never implies the learner is now job-ready or
      certified.
- [ ] Typecheck, lint, unit, architecture, build, E2E, and
      Lighthouse checks are required in CI.

## Non-goals

- A persistent event log. LEARN-060 owns privacy-safe learning
  events.
- Awarding a Module 0 completion badge. The existing XP and badge
  systems already record lesson completion; this is a celebration
  surface, not a new state transition.

## Dependencies

- LEARN-014 (STORY-132): the onboarding completion view shares the
  same plain-language voice and the same requireAuth gate.

## Verification

- Manual smoke: sign in, complete every Module 0 lesson, open
  `/dashboard/onboarding-complete`, confirm the four sections render
  and the Module 1 link works.
- Three Vitest tests cover the pure onboarding-status helper.
