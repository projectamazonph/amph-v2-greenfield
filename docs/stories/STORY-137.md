# STORY-137: LEARN-035 — Student portfolio page

**Sprint:** Learning experience uplift, wave 3

**Points:** 2

**Epic:** Student experience (LEARN-035)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-035 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Artefacts exist in the
database (LEARN-033) but no surface shows them back to the learner.
The portfolio page is the evidence home: the learner views every
saved artefact, exports their own set, and sees capstone readiness
without another learner's data ever leaking.

## Goal

Ship `/portfolio` (authenticated, owner-scoped) that lists the
caller's artefacts newest-first with kind, title, status, and date,
links one level deeper per artefact, and offers a JSON export of the
caller's own set. Add a dashboard link to the page. No simulator
percentage is labelled as certification.

## Scope

- `src/app/portfolio/page.tsx` (server component, `requireAuth`,
  calls `listArtefactsAction`).
- `src/app/portfolio/[id]/page.tsx` detail view (owner check via
  `findById` + userId match, 404 otherwise).
- `src/app/portfolio/export/route.ts` GET route returning the
  caller's artefacts as a JSON download (`portfolio-artefacts.json`,
  `Content-Disposition: attachment`).
- `src/app/portfolio/loading.tsx` with the AMPH skeleton.
- Dashboard link ("View portfolio") above the continue-learning card.
- Owner-scoped tests: another student's artefact id returns 404;
  export contains only the caller's rows.
- The page never implies certification or job-readiness.

## Acceptance criteria

- An unauthenticated visitor to `/portfolio` is redirected to `/login`.
- The page lists the caller's artefacts with kind, title, status,
  and created date.
- Opening another student's artefact id returns 404.
- The export downloads a JSON file with only the caller's artefacts.
- The dashboard links to `/portfolio`.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- PDF export (the account-data JSON export already covers
  LEARN-060; PDF is a later story if requested).
- Admin capstone review UI (LEARN-044).
- Editing artefacts inline on the portfolio page (the save flow is
  LEARN-034).

## Dependencies

- LEARN-033 (STORY-135): `listArtefactsAction` and the
  `IArtefactRepository.listByUser` owner-scoped read. This story's
  branch stacks on the LEARN-033 branch until it merges.

## Verification

- Route tests cover the owner-scope 404 and the export filter.
- Manual smoke: sign in as two students, create artefacts as each,
  confirm neither sees the other's rows on `/portfolio` or in the export.
