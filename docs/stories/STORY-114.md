# STORY-114 — Truthful public loading and availability states

**Sprint:** Learning experience uplift, wave 0

**Points:** 3

**Epic:** Student experience

**Owner:** Ryan

**Status:** In review in PR #387.

## Goal

Ensure a beginner sees the same honest programme summary whether JavaScript is
available, the count-up animation has started, or a screen reader is reading the
landing page. Public practice availability must also be explicit: the Bid
Elevator is a preview, while the other tools are enrolled practice.

## Scope

- Render the reviewed stat values as the initial `StatsStrip` state; count-up is
  an enhancement, never the source of truth.
- Keep simulator cards labelled as either public preview or enrolled practice,
  with no misleading loading or active-use claim.
- Add server-rendered contract tests covering the no-JavaScript and accessible
  summary states.

## Acceptance criteria

- Initial render never presents zero as a programme fact.
- No-JavaScript and screen-reader consumers receive the reviewed module, tool,
  and planned-time summary in server HTML.
- Public preview and enrolled practice remain visibly distinct.

## Verification

- Focused landing tests cover stable stat output and availability labels.
- Typecheck, lint, unit, architecture, build, E2E, and Lighthouse checks are
  required in CI.
