# SESSION-HANDOVER.md

**Updated:** 2026-07-17 (greenfield documentation set, day 0)

---

## Project Status

| Metric | Value |
|--------|-------|
| Phase | **Day 0 — greenfield scaffold + documentation** |
| Repo state | Empty, ready for `pnpm create next-app` |
| Architecture | SOLID five-layer (`domain/`, `ports/`, `usecases/`, `infra/`, `app/`, `composition/`) |
| Documentation | Complete: `README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `CHANGELOG.md`, `docs/` (12 files) |
| First sprint | Planned: `docs/sprint-1/PLAN.md` |
| First story | STORY-001: foundation + Result + Money + Clock + IdGenerator + ESLint boundary |
| Last commit | None yet (this is day 0) |
| Lint | N/A |
| Typecheck | N/A |
| Tests | N/A |
| Database | Not provisioned |
| Production | Not deployed |

---

## What Was Done This Session

The user asked for the full documentation set to mirror the legacy `amph-v2` repo (`README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `CHANGELOG.md`, `docs/`) but for a greenfield, SOLID-layered build. No code yet — docs only.

### Deliverables

- `README.md` — top-level, matches the legacy tone (hero, audience, what's inside, status table, command list, repo layout).
- `AGENTS.md` — six rules (legacy's five plus the new "dependency direction is inward" rule), voice, design system, architecture, database, business layer, admin, curriculum, code style, testing, commits, branching, CI, file dependency chain, SOLID contract, don'ts, error protocol, feature recipe, Memoria protocol.
- `CLAUDE.md` — what Claude Code needs to know: the five layers, the recipe for adding a feature, the boundary rules.
- `FEATURES.md` — the full surface area, 13 sections, every feature described in user-facing language.
- `CHANGELOG.md` — `[Unreleased]` section for the greenfield, with a reference pointer to the legacy changelog.
- `docs/product-brief.md` — what, why, audience, value, tiers, scope.
- `docs/decisions.md` — ADRs 001 through 020. ADRs 013–019 are new for the SOLID architecture.
- `docs/build-spec.md` — the engineering build spec, layer by layer.
- `docs/business-layer.md` — pricing, checkout, refunds, receipts.
- `docs/db-schema.md` — every Prisma model, every field, every index.
- `docs/api-reference.md` — every port method, every use case I/O, every server action, every route.
- `docs/admin-backend.md` — every admin route, every guard, every audit-log event.
- `docs/voice-guide.md` — banned phrases, sentence-level rules.
- `docs/design-brief.md` — the Field Manual direction.
- `docs/ai-removal.md` — what AI used to do, what replaced it.
- `docs/sprint-plan.md` — 12 sprints, story by story.
- `docs/sprint-1/PLAN.md` — Sprint 1 detailed plan.
- `docs/stories/STORY-001.md` through `STORY-010.md` — the first 10 stories.
- `docs/security/tenant-isolation.md` — isolation guard table.
- `docs/runbooks/README.md` — runbook index (runbooks themselves authored as their respective sprints ship).

### What Was NOT Done

- No code. Zero files under `src/`. Zero files under `prisma/`. The repo is docs-only.
- No `package.json`. No `pnpm-lock.yaml`. No `tsconfig.json`. (These are all Sprint 1, STORY-001 deliverables.)
- No database. The Neon / Vercel Postgres provisioning is STORY-002.
- No PayMongo sandbox account linked. That happens in STORY-005.
- No Resend domain verified. STORY-009.
- No Sentry project. STORY-011.
- No Vercel project. STORY-012.

The first real code commit lands when Sprint 1 starts, STORY-001 ("Foundation: Result + Money + Clock + IdGenerator + ESLint boundary rule") is picked up.

---

## Architecture, In One Page

Five layers, dependency direction always inward.

```
app/         → usecases/ → ports/ ← infra/
              domain/  (imports nothing)
```

- `src/domain/` — pure entities, value objects, business rules. No `next`, no `prisma`, no `paymongo`, no `resend`. Lint-enforced.
- `src/ports/` — interfaces only. Every method returns `Promise<Result<T, E>>`.
- `src/usecases/` — orchestration. One class per use case. Constructor-injected ports.
- `src/infra/` — adapters. Prisma, PayMongo, Resend, Sentry, PDF, rate-limit.
- `src/app/` — Next.js App Router. RSC by default. Server actions are 5-line shims.
- `src/composition/` — the DI container. The only file that knows every concrete type.

SOLID is enforced by directory structure and the ESLint boundary rule, not by code review. The full contract is in `AGENTS.md` §"SOLID contract" and `docs/build-spec.md` §"The SOLID contract".

---

## Sprint Plan, In One Page

12 sprints, 60 stories, 60 points. (Same total as the legacy repo, but the story mix is different — the SOLID architecture adds a foundation sprint and re-shapes the early sprints.)

| Sprint | Theme | Pts | Stories |
|--------|-------|-----|---------|
| 1 | Foundation + first vertical slice | 5 | 5 × 1pt |
| 2 | Auth + session | 5 | 5 × 1pt |
| 3 | Course catalog + content import | 5 | 5 × 1pt |
| 4 | PayMongo + checkout | 5 | 5 × 1pt |
| 5 | Enrollment + access policy | 5 | 5 × 1pt |
| 6 | Lesson delivery + progress | 5 | 5 × 1pt |
| 7 | Quizzes + XP + badges | 5 | 5 × 1pt |
| 8 | 5 simulators (1pt each) | 5 | 5 × 1pt |
| 9 | Certificates + email | 5 | 5 × 1pt |
| 10 | Admin panel (5 sub-areas) | 5 | 5 × 1pt |
| 11 | Observability + tests | 5 | 5 × 1pt |
| 12 | Launch + runbooks | 5 | 5 × 1pt |

See `docs/sprint-plan.md` for the full table and `docs/sprint-1/PLAN.md` for the first sprint in detail.

---

## Next Steps for Whoever Picks This Up

1. Read `AGENTS.md` first (5 minutes). Then `CLAUDE.md` (3 minutes). Then `docs/build-spec.md` (15 minutes). Then come back here.
2. Open STORY-001: foundation. Build the four primitives (`Result`, `Money`, `Clock`, `IdGenerator`), the ESLint boundary rule, the Vitest + Playwright scaffold, the `tsconfig.json`, the `package.json`. Land it green. Merge to `main`.
3. STORY-002: Prisma schema + first repo. STORY-003: first use case (`SignUp`). STORY-004: first page (signup form). STORY-005: first end-to-end Playwright test.
4. After Sprint 1 closes, the project is at a real vertical slice: a new user can sign up, see the empty dashboard, and the test suite proves it. From there, every subsequent sprint is "domain function + use case + adapter + page" — the same recipe.
5. Update `SESSION-HANDOVER.md` after every story closes. Conventional commit. Reference the story ID.

---

## Memoria Protocol

This repo uses Memoria for cross-agent context. Tag memories with:
- `project:amph-v2`
- `phase:1` (analysis), `2` (planning), `3` (solutioning), `4` (implementation), `5` (enrichment)
- `agent:dusk` (this instance)

Other agents (Atlas on phone OpenClaw, Vader on phone Hermes) share the same memoria server. Leave notes for them on handoffs.

---

## Daily Log

(Empty. Add entries here as work progresses. Format: `### YYYY-MM-DD — <one-line summary>` followed by what was asked, what was done, what was explicitly not done, what the next agent should do. Mirror the legacy `amph-v2` SESSION-HANDOVER cadence.)
