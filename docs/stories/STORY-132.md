# STORY-132: LEARN-014 — Guided first-decision route

**Sprint:** Learning experience uplift, wave 1

**Points:** 2

**Epic:** Student experience (LEARN-014)

**Owner:** Ryan

**Status:** Planned.

## Context

This story opens LEARN-014 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. A new learner finishes
Module 0 and is then asked to make a safe PPC decision. The build plan
calls the route "guided" because it preloads the beginner scenario,
explains the result, and never grades the learner as job-ready. It is
the first 20 minutes of the course made concrete.

## Goal

Add a dedicated onboarding route at `/dashboard/first-decision` that
walks a logged-in learner through one constrained bid-elevator
decision before they ever open a real client account. The page reads
the published beginner scenario from the simulator registry and
links directly to the existing Bid Elevator tool with a "back" link
to the onboarding route so the result view stays in the same flow.

## Scope

- Add a static first-decision brief to
  `content/curriculum/first-decision.json` with three fields: the
  scenario context, the decision rule, and the result interpretation.
- Add `src/app/dashboard/first-decision/page.tsx` that requires
  authentication, reads the brief, and renders the scenario context,
  the decision rule, and a "Start the practice decision" button that
  links to `/tools/bid-elevator`.
- Add a small `FirstDecisionResultNotice` client component that
  renders inline in the Bid Elevator form when the learner arrives
  from the first-decision route via a `?from=first-decision` query
  string, and reminds them to read the result explanation back on
  `/dashboard/first-decision`.
- Add `loading.tsx` with the AMPH `SkeletonCard` skeleton.
- The route is recommendation-only and never changes entitlement.
- Three Vitest tests cover the brief loader.

## Acceptance criteria

- [ ] An unauthenticated visitor to `/dashboard/first-decision` is
      redirected to `/login`.
- [ ] The page renders the brief content from
      `content/curriculum/first-decision.json`.
- [ ] The "Start the practice decision" button links to
      `/tools/bid-elevator`.
- [ ] Arriving at `/tools/bid-elevator?from=first-decision` shows
      the `FirstDecisionResultNotice` reminder.
- [ ] The brief is plain language; no job-readiness or
      certification wording is introduced.
- [ ] Typecheck, lint, unit, architecture, build, E2E, and
      Lighthouse checks are required in CI.

## Non-goals

- A custom scenario loader. The page uses the published scenario
  surfaced by the simulator registry; LEARN-031 owns authoring
  multiple difficulty tiers.
- Persisting the "I finished my first decision" event to the
  database. The LEARN-060 measurement work owns that event schema.

## Dependencies

- LEARN-010 (STORY-130): the dashboard already has a
  `/dashboard/diagnostic` route; the first-decision route reuses
  the same requireAuth gate and AMPH shell.
- LEARN-013 (STORY-131): the inline glossary terms can be used in the
  first-decision brief once the directive plugin is wired (a
  follow-up story).

## Verification

- Manual smoke: sign in, open `/dashboard/first-decision`, click
  "Start the practice decision", confirm the Bid Elevator tool opens
  with the `FirstDecisionResultNotice` visible.
- Three Vitest tests cover the brief loader and the route's
  requireAuth gate.
