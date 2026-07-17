# SESSION-HANDOVER.md

**Updated:** 2026-07-17 — Sprint 1 complete. All PRs merged. Next: STORY-021.

---

## Project Status

| Metric | Value |
|--------|-------|
| Phase | **Sprint 1 complete** |
| Repo | `projectamazonph/amph-v2-greenfield` (public) |
| Default branch | `main` (squash-merge only, branches auto-delete on merge) |
| Topics | `amph`, `amazon-ppc`, `filipino-va`, `nextjs16`, `prisma7`, `paymongo`, `resend`, `solid`, `clean-architecture`, `hexagonal-architecture`, `domain-driven-design`, `typescript`, `vitest`, `playwright`, `sentry`, `documentation` |
| Issues / Discussions | enabled; Projects + Wiki | disabled |
| Architecture | SOLID five-layer (`domain/`, `ports/`, `usecases/`, `infra/`, `app/`, `composition/`) |
| Documentation | Complete: 23+ .md files in the root + `docs/` tree |
| Repo hygiene | `LICENSE` (proprietary), `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore`, `.github/CODE_OF_CONDUCT.md`, `.github/SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, 3 issue templates, `.github/workflows/ci.yml`, `.github/dependabot.yml` |
| Tests | **161 unit tests, 16 test files, 0 TypeScript errors** |
| `main` HEAD | `8b985cf` — feat(sprint-1): complete implementation — Stories 001-017 + JWT (#10) |
| Database | Not provisioned |
| Production | Not deployed |
| GitHub PAT | Embedded in remote URL — recommend revoke + issue fine-grained token scoped to `projectamazonph/amph-v2-greenfield` |

---

## What Ships in `main` (Sprint 1)

| Story | What |
|-------|------|
| 001-006 | Foundation: `Result<T,E>`, `Money`, `Clock`, `IdGenerator`, `User`, `SignUp`, `Argon2PasswordHasher`, Prisma schema (8 models), `/signup`, middleware, DI container |
| 008 | `Course` entity with fail-fast domain rules |
| 012 | `Login` use case + `SessionRepository` port + `Session` entity |
| 013 | `JwtService` port + `JoseJwtService` (jose, HS256) + middleware JWT verification on `/dashboard`, `/admin`, `/enroll`, `/order` |
| 016 | `ListCourses` use case + `/courses` catalog page |
| 017 | `GetCourse` + `EnrollStudent` use cases + `/courses/[slug]` detail page + enrollment action |

**Additional docs in repo:** `OPERATING_GUIDELINES.md`, `BOOTSTRAP.md`, updated `SESSION-HANDOVER.md`

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

**Key conventions:**
- `Result<T, E>` across all layer boundaries — no exceptions in domain/ports/usecases
- `Money` uses integer minor units — never `number` for money
- ESLint boundary rule blocks framework/IO imports from domain/ports/usecases
- `crypto.randomUUID()` for ID generation
- `SESSION_TTL = "7d"` (jose-compatible duration string)

---

## Sprint Plan

12 sprints, 60 stories, 60 points.

| Sprint | Theme | Status |
|--------|-------|--------|
| 1 | Foundation + first vertical slice | ✅ **Complete** |
| 2–12 | Auth, catalog, checkout, enrollment, lessons, quizzes, simulators, certs, admin, observability, launch | Pending |

See `docs/sprint-plan.md` for the full table and `docs/sprint-1/PLAN.md` for Sprint 1 detail.

---

## Next Story: STORY-021 (PayMongo Checkout)

STORY-021 doc does not yet exist in `docs/stories/`. Read `docs/decisions.md` ADR-014 and `docs/build-spec.md` §Checkout first, then write the story doc before starting.

### What STORY-021 needs

1. **`PayMongoService` port** — `createCheckoutSession(params: { amountMinor: number; description: string; metadata: Record<string, string>; successUrl: string; cancelUrl: string }) → Promise<Result<{ checkoutUrl: string; checkoutId: string }, CheckoutError>>`
2. **`PaymongoCheckoutService` adapter** — uses PayMongo API, `amount` = `minor` (1:1 mapping), `HttpClient` injected
3. **`Checkout` use case** — validates course is published + student not enrolled, creates checkout session, returns `checkoutUrl`
4. **`/order/[courseId]` page** — renders order confirmation, redirects to `checkoutUrl`
5. **Unit tests** for the port + use case

### Key decisions from ADRs

- `PayMongo Checkout (one-time)` is the only payment path
- `PayMongo.amount` maps 1:1 to `Money.minor / 100`
- No recurring/subscription
- Webhook handler comes in STORY-022

---

## Open PRs

All closed. Sprint 1 PRs merged in order: #6 → #7 → #8 → #9 → #10.

| # | Branch | Status |
|---|--------|--------|
| #6 | `feature/story-001-006-foundation` | Closed (absorbed into #10) |
| #7 | `feature/story-008` | Closed (absorbed into #10) |
| #8 | `feature/story-012` | Closed (absorbed into #10) |
| #9 | `feature/story-016-017` | Closed (absorbed into #10) |
| #10 | `feature/story-013` | ✅ Merged |

---

## Daily Log

### 2026-07-17 — Sprint 1: complete

**Done:**
- PRs #6–#10 rebased and merged. PR #10 (feature/story-013) was the final merge — it contained all unique commits (JWT, docs, OPERATING_GUIDELINES, BOOTSTRAP, SESSION-HANDOVER updates).
- Force-push note: `feature/story-001-006-foundation` was force-pushed during rebase conflict resolution, which collapsed all other feature branches to match `main`. Only `feature/story-013` survived with its unique commits.
- Resolution: opened single PR from `feature/story-013`, rebased with `-X ours` to auto-resolve conflicts, pushed fixes (Result import path update + missing Login import in test), 161 tests passing.
- `main` now has all of Sprint 1: Stories 001-006, 008, 012, 013, 016, 017.
- 161 unit tests, 16 test files, 0 TypeScript errors.

**Next agent:**
1. Write `docs/stories/STORY-021.md` — PayMongo checkout story doc.
2. Implement STORY-021: `PayMongoService` port, `PaymongoCheckoutService` adapter, `Checkout` use case, `/order/[courseId]` page, tests.
3. Open PR, get CI green, merge.
4. Continue with STORY-022 (webhook handler).

---

## How to Bootstrap a New Session

Copy-paste the full prompt from `BOOTSTRAP.md`. It contains the architecture overview, what's in `main`, what to do next, and the key conventions.

---

## Memoria Protocol

This repo uses Memoria for cross-agent context. Tag memories with:
- `project:amph-v2`
- `phase:4` (implementation)
- `agent:mavis`

Other agents (Atlas, Vader) share the same memoria server. Leave notes on handoffs.
