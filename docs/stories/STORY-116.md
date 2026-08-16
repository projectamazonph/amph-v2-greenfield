# STORY-116 — Add the content publishing and release gate

**Sprint:** Learning experience uplift, wave 0

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In progress on the release-gate branch.

## Goal

Prevent a curriculum source change from being treated as live before its
database import, public claims, and logged-in learner path have been verified.

## Scope

- Add a combined source-contract command for inventory and public claims.
- Add a CI release-gate job that runs after quality, unit, and Playwright checks.
- Author the ordered staging/production runbook and evidence checklist.

## Acceptance criteria

- Source inventory and public-claim validation are a named CI gate.
- The runbook separates import, claim validation, and learner smoke operations.
- Production promotion requires recorded import output and a logged-in learner
  smoke report, not only a public page check.

## Verification

- `pnpm validate:learning-release` passes.
- CI quality, architecture, unit, E2E, build, and Lighthouse checks remain
  required.
