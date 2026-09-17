# STORY-144: LEARN-044 — Reviewer queue and rubric workflow

**Sprint:** Learning experience uplift, wave 4

**Points:** 3

**Epic:** Student experience (LEARN-044)

**Owner:** Ryan

**Status:** Done.

## Context

This story opens LEARN-044 in
`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`. Submissions exist
(LEARN-043) but no reviewer can see them: there is no queue, no
return-for-revision path with a note, and no pass action. The
human-review tier needs an audited workflow where every reviewer
action is authorised, logged, and visible to the learner.

## Goal

Ship an admin reviewer queue at `/admin/capstone` listing every
SUBMITTED capstone oldest-first, a review page at
`/admin/capstone/[id]` showing the six artefacts with the rubric
criteria beside each one, and two audited reviewer actions: return
for revision (note required) and pass (six artefact ids required).
The learner sees the reviewer note and the PASSED state on
`/capstone` (already renders both).

## Scope

- `ICapstoneRepository.listByStatus` + both adapters (SUBMITTED
  queue, oldest first).
- `ListCapstoneReviewQueue` use case (admin-only by route, not by
  flag).
- `ReturnCapstoneForReview` use case: reviewer → NEEDS_REVISION
  with required note + `capstone.returned` audit event.
- `PassCapstoneReview` use case: reviewer → PASSED with six-id
  gate + `capstone.passed` audit event.
- Admin pages `/admin/capstone` and `/admin/capstone/[id]` behind
  `requireAdmin()`, with `loading.tsx` skeletons.
- Reviewer actions in `src/app/actions/capstone-review.action.ts`
  with `requireAdmin()` + audit passthrough.
- Use-case tests via `buildTestContainer()`; action tests with
  mocked container.
- Domain branch coverage stays 100% (return/pass already covered
  in `CapstoneSubmission.test.ts`).

## Acceptance criteria

- An admin opening `/admin/capstone` sees every SUBMITTED row
  with learner, date, and six artefact links.
- Returning for revision without a note is rejected.
- Passing without six artefact ids is rejected.
- Every reviewer action writes an audit log row with actor, action,
  target, and timestamp.
- The learner's `/capstone` page shows the reviewer note after a
  return and the PASSED banner after a pass.
- Non-admins hitting the review routes or actions get bounced.
- `pnpm typecheck && pnpm lint && pnpm test` green.

## Non-goals

- Per-criterion point entry (the rubric scores 0–2 per
  deliverable; numeric entry is a follow-up — pass/fail with the
  six-id gate is this story).
- Certificate auto-issuance on pass (existing flow; wiring later).
- Email to the learner on decision (notification emit is a
  follow-up reusing NotifyUser).

## Dependencies

- LEARN-043 (STORY-143): submission lifecycle, `/capstone` page.

## Verification

- Use-case tests cover queue ordering, return validation, pass
  gate, and audit calls.
- Manual smoke: submit as a learner, open `/admin/capstone` as
  admin, return with a note, confirm the learner sees it; submit
  again, pass, confirm the PASSED banner.
