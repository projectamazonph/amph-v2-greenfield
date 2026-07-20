# UI Wiring Plan — Sprint 11 closeout

**Date:** 2026-07-20
**Author:** Mavis
**Scope:** 14 student-facing pages that have wireframes but no implementation.

## Goal

The repo has wireframes for 24 screens (in `docs/ui-specs/wireframes/`)
but only 10 of them are actually built. This sprint finishes the
wiring-up: every "Ready" or "Planned" wireframe that has a real
domain layer behind it gets a working page.

Domain code is real for almost everything. What's missing is the
React/Next.js page that calls the use case and renders the result.

## Status today (from `docs/ui-specs/wireframes/README.md`)

| Surface | Built | Ready | Planned |
|---|---|---|---|
| Public | 3 of 5 | 2 | 0 |
| Student | 2 of 5 | 3 | 0 |
| Tools | 0 of 5 | 5 | 0 |
| Admin | 0 of 9 | 0 | 9 |
| **Total** | **5 of 24** | **10 of 24** | **9 of 24** |

Admin work is its own sprint (Sprint 10). This sprint finishes
the **10 Ready** + the 1 mixed (`/pricing`).

## Pages to build (14 total)

### Tools (5) — the highest-priority chunk

All 5 share the same pattern: page = breadcrumb + scenario header
card (from the Stitch spec) + form (driven by simulator input
type) + submit button + result panel (driven by simulator output
type). They wire directly to the 4 simulators in
`src/domain/simulator/` plus the `tools-index` page that links
to all of them.

| Route | Source wireframe | Simulator | Notes |
|---|---|---|---|
| `/tools` | `tools-index.html` | (registry) | List the 4 simulators with descriptions + "Open" links |
| `/tools/bid-elevator` | `tools/bid-elevator.html` | `BidElevatorSimulator` | Form: keywords + bids + budget + target ROAS → recommendations + score |
| `/tools/str-triage` | `tools/str-triage.html` | `StrTriageSimulator` | Form: search terms → categorize each into keep/optimize/pause/negate |
| `/tools/campaign-builder` | `tools/campaign-builder.html` | `CampaignBuilderSimulator` | Multi-step wizard: campaign → bidding → ad group → targets → review |
| `/tools/listing-audit` | `tools/listing-audit-keyword-research.html` | `ListingAuditSimulator` | 2-step: flag issues (7 fields) → revise listing (form) |

### Student (3)

| Route | Wireframe | Domain | Notes |
|---|---|---|---|
| `/dashboard` | `student/dashboard.html` | `EnrollStudent` + XP + badges | Already has a placeholder page; needs the real layout |
| `/profile` | `student/profile-badges.html` | `ListUserBadges` + user | Show earned badges grid, profile fields, public cert link |
| `/courses/[slug]/lessons/[id]/quiz` | `student/quiz.html` | `RecordQuizAttempt` | Quiz player with `RecordQuizAttempt` use case + XP award on pass |

### Public (2)

| Route | Wireframe | Domain | Notes |
|---|---|---|---|
| `/pricing` | `public/pricing.html` | (none — read-only) | The 3 tiers + FAQ — mirror the landing-page pricing card style |
| (no new — `/` already built) | — | — | Landing page is done |

### Already built (do not touch)

- `/` (landing)
- `/courses` (catalog)
- `/courses/[slug]` (course detail)
- `/signup`, `/login`
- `/courses/[slug]/lessons/[id]` (lesson player)
- `/certificates/[hash]` (verification)

## Architecture constraints (from `tests/architecture/`)

Per the 8 architecture tests, every new page must:

1. **Use the port-based DI container.** Pages construct use cases
   by calling `buildContainer()` (server components) or
   `getContainer()` inside a request handler. Never `new` a use
   case inline.
2. **Not import adapters directly.** Import from `@/ports/...`
   in components, import from `@/infra/...` only inside
   `src/composition/`.
3. **Not throw across layer boundaries.** Use cases return
   `Result<T, E>`; server actions convert to the response shape.
4. **Use CSS Modules + design tokens.** No Tailwind. No
   hardcoded colors. No inline styles for layout.

## Container additions needed

`src/composition/container.ts` (prod) and
`src/composition/container.test.ts` (test) need the simulator
registry exposed. The test container already builds
`simulatorRegistry` but the prod container needs to too.

The registry lives behind the `SimulatorRegistry` port. To call a
simulator from a page: `registry.get(simulatorId)?.run(input)`.

For the listing-audit + keyword-research page, the same simulator
(`ListingAuditSimulator`) handles both audit and research inputs
— separate input types, separate output types, same engine.

## TDD plan

For each page, the order is RED → GREEN → REFACTOR:

1. **RED**: write a test that asserts the page renders the right
   structure for the seeded scenario (form fields, route, copy).
2. **GREEN**: implement the page, run the simulator, render the
   result. Minimum code to make the test pass.
3. **REFACTOR**: extract reusable parts (FormField, ResultPanel,
   ScoreBadge) into a `src/components/tools/` folder so each
   subsequent page is smaller.

Test framework: `vitest` with `renderToString` (server components)
or `@testing-library/react` (client components). The quiz page
needs a client component (form state).

## Workstream breakdown

The 5 tools pages are the most independent — they can be built in
parallel by separate agents. The 3 student pages also share
patterns. Two workstreams:

### Workstream A — Tools (5 pages, ~3 days wall-clock with 3 agents)

- Agent A1: `/tools` index + `/tools/bid-elevator` (the vertical
  slice template; the others reuse what this builds)
- Agent A2: `/tools/str-triage` and `/tools/campaign-builder`
  (using the template from A1)
- Agent A3: `/tools/listing-audit` (the 2-step page is the most
  complex; split off so it doesn't block the others)

### Workstream B — Student (3 pages, ~2 days wall-clock with 2 agents)

- Agent B1: `/dashboard` (replace placeholder with real layout)
- Agent B2: `/profile` + `/courses/[slug]/lessons/[id]/quiz`
  (both have real domain code; small)

### Workstream C — Public (1 page, ~0.5 days)

- Single agent for `/pricing` (read-only, no use case needed)

## What's NOT in this sprint

- Admin pages (`/admin/*`). All 9 are Sprint 10 work and don't
  have the domain layer for some of them anyway.
- Lighthouse CI re-enable. Tracked as a follow-up in
  `docs/adr/0026-lighthouse-ci-disabled.md`.
- STORY-007 (email verification) closing. Branch
  `feat/story-007-email-verification` has the use cases but
  not the verification page or the email template.
- STORY-008 (password reset). Different scope.
- The `/courses/[slug]/lessons/[id]/quiz` route is being
  created for the first time — there's no existing route.
- Storybook / component library. Out of scope.

## Success criteria

- [ ] All 5 tools pages render + run their simulator + show
  real output for a hardcoded scenario.
- [ ] `/dashboard` shows the student's enrolled courses, XP
  total, and recent badges.
- [ ] `/profile` shows the user's badges grid and profile fields.
- [ ] `/courses/[slug]/lessons/[id]/quiz` plays a quiz and calls
  `RecordQuizAttempt` on submit.
- [ ] `/pricing` shows the 3 tiers.
- [ ] Each new page has ≥ 3 component tests.
- [ ] Architecture suite still 398/398.
- [ ] `pnpm typecheck` clean.
- [ ] Total test count grows by ~25-30 (5 per tools page × 5,
  3 per student page × 3, 3 for pricing).

## Estimated timeline

3 days wall-clock with the team (3 tools agents + 2 student
agents + 1 pricing agent) in parallel. After: review pass, fix
broken things, ship as a single PR or split per workstream.
