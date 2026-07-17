# SESSION-HANDOVER.md

**Updated:** 2026-07-17 — Sprint 1 in progress. 5 PRs open. Check CI on each.

---

## Project Status

| Metric | Value |
|--------|-------|
| Phase | **Day 0 — greenfield repo bootstrapped, docs-first** |
| Repo | `projectamazonph/amph-v2-greenfield` (public) |
| Default branch | `main` (squash-merge only, branches auto-delete on merge) |
| Topics | `amph`, `amazon-ppc`, `filipino-va`, `nextjs16`, `prisma7`, `paymongo`, `resend`, `solid`, `clean-architecture`, `hexagonal-architecture`, `domain-driven-design`, `typescript`, `vitest`, `playwright`, `sentry`, `documentation` |
| Issues / Discussions | enabled; Projects + Wiki | disabled |
| Architecture | SOLID five-layer (`domain/`, `ports/`, `usecases/`, `infra/`, `app/`, `composition/`) |
| Documentation | Complete: 23 .md files in the root + `docs/` tree |
| Repo hygiene | `LICENSE` (proprietary), `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore`, `.github/CODE_OF_CONDUCT.md`, `.github/SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, 3 issue templates, `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| First sprint | Planned: `docs/sprint-1/PLAN.md` |
| First story | STORY-001: foundation + Result + Money + Clock + IdGenerator + ESLint boundary |
| Last commit | `bbb3b74` (docs) — `main` HEAD; next commit will be the repo-hygiene bundle above |
| Lint | N/A (no code yet) |
| Typecheck | N/A |
| Tests | N/A |
| Database | Not provisioned |
| Production | Not deployed |
| GitHub PAT | Stored as secret `GITHUB_TOKEN_PAT` for this session; recommend revoke + re-issue with fine-grained scope when convenient. |

---

## What Was Done This Session

The user asked for the full documentation set to mirror the legacy `amph-v2` repo (`README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `CHANGELOG.md`, `docs/`) but for a greenfield, SOLID-layered build. No code yet — docs only. Then asked to create a new GitHub repo and push, then to "update everything on the repo."

### Deliverables (this session, cumulative)

- `README.md` — top-level, matches the legacy tone (hero, audience, what's inside, status table, command list, repo layout).
- `AGENTS.md` — six rules (legacy's five plus the new "dependency direction is inward" rule), voice, design system, architecture, database, business layer, admin, curriculum, code style, testing, commits, branching, CI, file dependency chain, SOLID contract, don'ts, error protocol, feature recipe, Memoria protocol.
- `CLAUDE.md` — what Claude Code needs to know: the five layers, the recipe for adding a feature, the boundary rules.
- `FEATURES.md` — the full surface area, 13 sections, every feature described in user-facing language.
- `CHANGELOG.md` — `[Unreleased]` section for the greenfield, with a reference pointer to the legacy changelog. Updated again to record the repo bootstrap.
- `docs/product-brief.md` — what, why, audience, value, tiers, scope.
- `docs/decisions.md` — ADRs 001 through 021. ADRs 013–019 are new for the SOLID architecture.
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
- `LICENSE` (proprietary), `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore`, `.github/CODE_OF_CONDUCT.md`, `.github/SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, three issue templates, `.github/workflows/ci.yml`, `.github/dependabot.yml`.

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

## Open PRs

| # | Branch | Stories | Tests |
|---|--------|---------|-------|
| [#6](https://github.com/projectamazonph/amph-v2-greenfield/pull/6) | `feature/story-001-006-foundation` | 001–006: foundation | 161 pass |
| [#7](https://github.com/projectamazonph/amph-v2-greenfield/pull/7) | `feature/story-008` | 008: Course entity | deps on #6 |
| [#8](https://github.com/projectprojectamazonph/amph-v2-greenfield/pull/8) | `feature/story-012` | 012: Login + Session | deps on #6+7 |
| [#9](https://github.com/projectamazonph/amph-v2-greenfield/pull/9) | `feature/story-016-017` | 016–017: catalog + enrollment | deps on #6+7+8+10 |
| [#10](https://github.com/projectamazonph/amph-v2-greenfield/pull/10) | `feature/story-013` | 013: JWT tokens + middleware | deps on #6+8 |

> **TODO (next session):** Check CI status on all 5 PRs once builds complete. If any fail, fix and re-push on the respective branch. Merge order: #6 → #7 → #8 → #10 → #9.

## Daily Log

### 2026-07-17 — Sprint 1: foundation + first 4 stories shipped as 5 PRs

**Asked:** Full greenfield rebuild of AMPH Academy v2 with SOLID architecture, TDD, docs-first.

**Done:**
- Full documentation set (23 .md files, ADRs 001–021)
- Repo bootstrapped (`projectamazonph/amph-v2-greenfield`, squash-only, auto-delete branches)
- Stories 001–006: `Result<T,E>`, `Money`, `Clock`, `IdGenerator`, `User`, `SignUp`, `Argon2PasswordHasher`
- Story 008: `Course` entity with fail-fast domain rules
- Story 012: `Login` use case + `SessionRepository` port + `Session` entity
- Stories 016–017: `ListCourses`, `GetCourse`, `EnrollStudent` + `/courses` catalog + `/courses/[slug]` detail + enrollment action
- Story 013: `JwtService` port + `JoseJwtService` adapter + `Login` signs JWT + middleware verifies JWT on protected routes
- 161 unit tests, 16 test files, 0 TypeScript errors
- 5 PRs opened with `feature/*` branches

**Not done:**
- CI not yet verified on any PR
- Database not provisioned
- No real auth pages beyond `/signup`
- `pnpm-lock.yaml` updated with `jose` dep

**Next agent:**
1. Check CI on PRs #6–#10. Fix any failures.
2. Merge PRs in order: #6 → #7 → #8 → #10 → #9.
3. After merging all PRs, confirm `main` has all stories. Run `pnpm test` + `pnpm typecheck` against `main`.
4. Continue with STORY-021 (PayMongo checkout).
