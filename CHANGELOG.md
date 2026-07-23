# Changelog

All notable changes to Project Amazon PH Academy v2 are documented here.

## [Unreleased]

### 2026-07-24: Vercel Hobby cron schedule fix

- **PR #153** (merged as `72896f4`): `fix(vercel): change live-class-reminders cron to once daily (Hobby plan limit)`
  - Vercel Hobby plan only allows one cron job per day. The previous schedule `0/5 * * * *` (every 5 minutes) was being rejected at deploy time with: "Hobby accounts are limited to daily cron jobs. This cron expression (0/5 * * * *) would run more than once per day."
  - Changed to `0 8 * * *` (8 AM UTC = 4 PM PHT, daily). Once-daily at 4 PM PHT is the right cadence for T-24h-style live class reminders (reminder the afternoon before a next-morning class).
  - If finer cadence is needed later, the cron can be moved to GitHub Actions (a working schedule already exists in `.github/workflows/daily-triage.yml` at `0 9 * * 1-5`).
  - 1 file changed, 1 insertion / 1 deletion.
- Also added `amph-v2-greenfield/` to `.gitignore`. A self-referencing copy of the project has been appearing in the workspace root, polluting `git status`. Not in git and not affecting production, but the ignore rule prevents accidental commits.

### 2026-07-24: Pricing tier seed script fix + production deploy

- **PR #150** (merged as `9aca555`): `fix: construct proper PricingTier entity in seed script (use Money.of)`
  - `scripts/seed-pricing-tiers.ts` was passing flat `{ priceMinor: 299900 }` objects to `repo.create()`, but `PrismaPricingTierRepository.mapData()` reads `tier.price.minor` — the domain entity has `price: Money`, not a flat `priceMinor` field. The repository's first call threw `TypeError: Cannot read properties of undefined (reading 'minor')`.
  - Fixed by importing `Money` from `@/domain/values/Money` and constructing a proper `PricingTier` entity with `price: Money.of(priceMinor, "PHP")` in both the create and update paths.
  - Regenerated Prisma client (`pnpm prisma:generate`) after the early-bird migration (`20260722050000_pricing_tier`) added the `earlyBirdPriceMinor` / `earlyBirdEndsAt` fields — the seed script's first attempt failed with `Unknown argument 'earlyBirdPriceMinor'` because the generated client was stale.
  - All 4 pricing tiers now seed cleanly: foundations (₱2,999), mastery (₱5,999, early-bird ₱4,999 for 7 days), ultimate (₱9,999, early-bird ₱7,999 for 3 days), all-access (₱14,999).
  - 1 file changed, 9 insertions / 7 deletions. All 6 CI checks green.

- **Production deploy: `https://amph-v2-greenfield.vercel.app` is live**
  - Vercel project linked to `amph-v2-greenfield` (`prj_3tEN1Akupoosai3OAGc1t50ru5QG`).
  - All required environment variables synced from Vercel to local `.env.local` and `.env`: `DATABASE_URL` (Neon Postgres), `SHADOW_DATABASE_URL`, `JWT_SECRET`, `PAYMONGO_SECRET` (live key), `PAYMONGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`.
  - `pnpm prisma migrate deploy` applied all 12 migrations to the production Neon database.
  - `pnpm db:seed:tiers` seeded all 4 pricing tiers.
  - Vercel auto-deployed the latest `main` HEAD via the Git integration. Smoke-tested routes:
    - `GET /` → 200 (landing page renders all sections)
    - `GET /signup` → 200
    - `GET /login` → 200
    - `GET /dashboard` → 307 (redirects to login when unauthenticated, correct behavior)
  - Remaining operator-owned launch items: configure PayMongo webhook endpoint at the live URL, create first admin user, add custom domain (optional), smoke test the full signup → checkout → enrollment flow, run STORY-057/058/060.

### 2026-07-24: CSS variable token fixes — 18 files, 106 insertions

- **PR #147** (merged as `75d2709`): `fix(ui): replace undefined CSS variable references with correct AMPH token names`
  - 18 files affected across admin form pages (`admin/simulators/new`, `admin/simulators/[id]/edit`, `admin/discount-codes/new`, `admin/discount-codes/[id]/edit`, `admin/badges/new`, `admin/badges/[slug]/edit`, `admin/live-classes/new`, `admin/live-classes/[id]/edit`), 7 `Admin*Table` Astryx components, and 2 CSS module files.
  - Replaced undefined `var(--color-*)` references with correct AMPH design tokens: `var(--color-accent)` → `var(--accent)`, `var(--color-danger)` → `var(--danger)`, `var(--color-text-primary)` → `var(--ink-900)`, `var(--color-text-secondary)` → `var(--ink-700)`, `var(--color-text-muted)` → `var(--ink-500)`, `var(--color-text-disabled)` → `var(--ink-300)`, `var(--color-border)` → `var(--border)`, `var(--color-background-muted)` / `var(--color-bg-muted)` → `var(--surface-2)`, `var(--color-on-accent)` → `var(--accent-ink)`, `var(--color-accent-dark)` → `var(--accent-hover)`.
  - These bugs were pre-existing from the original Astryx installation (commit `9e9b297 feat(astryx)`) — not introduced by the migration PR.
  - All 6 CI checks green. No test changes needed (CSS tokens, no behavior change).

### 2026-07-24: Astryx UI migration — all admin pages migrated, student UI hardened

- **PR #146** (merged as `f4d6765`): `fix(ui): STORY-055 migrate all pages to @astryxdesign/core + student UI hardening`
  - Migrated all remaining admin pages from `@/components/ui` to `@astryxdesign/core` using the `Card`, `Badge`, `Table`, `Button`, `TextField`, `Select`, `TextArea`, `Link`, `Input`, `Tab`, `TabList`, `TabPanel` Astryx components.
  - `admin/courses/[id]/page.tsx`, `admin/courses/[id]/edit/page.tsx`, `admin/users/[id]/page.tsx`, `admin/payments/[id]/page.tsx`, `admin/simulators/[id]/edit/page.tsx`, `admin/discount-codes/[id]/edit/page.tsx`, `admin/badges/page.tsx`, `admin/simulators/new/page.tsx`, `admin/discount-codes/new/page.tsx`, `admin/badges/new/page.tsx`, `admin/badges/[slug]/edit/page.tsx`, `admin/live-classes/new/page.tsx`, `admin/live-classes/[id]/edit/page.tsx`, and 5 `Admin*Table` components all migrated.
  - Kept `@/components/ui` for login and signup: Astryx `Button` uses `label` prop (not `children`) and `isDisabled` (not `disabled`) — incompatible with server-action uncontrolled forms. AMPH's own `Button` and `Input` work correctly.
  - Added `idle` state to `SignUpState` (`export type SignUpState = SignUpResult | { kind: "idle" }`) to prevent first-render validation flash on signup form.
  - Applied student UI hardening patch: responsive tables with keyboard-reachable scroll regions, `min-width` enforcement on all table layouts, `idle` state handling on forms.
  - Added `src/app/signup/__tests__/page.test.tsx` — regression test for idle-state contract on signup page.
  - Added `src/components/tools/__tests__/responsive-tables.test.ts` — verifies keyboard-reachable scroll regions and `min-width` enforcement on table components.
  - Simulator scroll wrappers verified: `BidElevatorForm`, `BidElevatorResult`, `StrTriageForm` all have `tableScroll` CSS class + `role="region"` + `aria-label` + `tabIndex={0}`.
  - 56 files changed, +767/-549 lines. All 6 CI checks green.

### 2026-07-23: Rate-limit policy reconciliation — STORY-054 finally closed

- **PR #145** (merged as `9e0624c`): `fix(security): STORY-054 rate-limit policy reconciliation`
  - STORY-054 was marked done in the sprint plan but the rate limiter was never actually wired into the server actions — a silent gap found during the sprint-11 review.
  - `signup.action.ts`: calls `rateLimiter.check()` by IP (5 req / 15 min), returns `{ kind: 'rate_limited' }` when blocked. Fails open on Redis errors.
  - `login.action.ts`: calls `rateLimiter.check()` by IP (10 req / 15 min), redirects to `/login?error=rate_limited`. Fails open.
  - `checkout.action.ts`: calls `rateLimiter.check()` by userId (10 req / 1 hour). Fails open.
  - All three action pages updated with user-facing rate-limit error messages.
  - `tests/architecture/rate-limit-wiring.test.ts` expanded: 9 assertions verify `rateLimiter.check()` is called in all three actions.
  - `src/app/actions/__tests__/checkout.action.test.ts`: added `rateLimiter` mock to container, reset in `beforeEach`, new test for the `rate_limited` branch.
  - All 6 CI checks green. Supersedes PR #133 (same intent, never fully wired).

### 2026-07-22: Module/Lesson admin CRUD now writes to the audit trail

- `fix(admin): wire RecordAuditLog into the 8 Module/Lesson use cases`
  - Every other admin resource (`Course`, `LiveClass`, `DiscountCode`, `Badge`, `SimulatorScenario`) calls `RecordAuditLog` on create/update/delete/archive; `Module`/`Lesson` never did, a gap every PR in the P0-2 series left unchecked in its own "Architecture" checklist. `AuditAction` already reserved `module.*`/`lesson.*` success actions (STORY-050a) but no use case used them.
  - Added `module.*_failed`/`lesson.*_failed` to `AuditAction` (matching the `discount_code.*`/`badge.*`/`live_class.*` convention).
  - `CreateModule`, `UpdateModule`, `DeleteModule`, `ReorderModules`, `CreateLesson`, `UpdateLesson`, `DeleteLesson`, `ReorderLessons`: added `actorId` to `Input`, `recordAuditLog` to `Deps`, and a `recordAuditLog.execute()` call on every success and failure path, mirroring `CreateLiveClass`/`UpdateLiveClass`/`DeleteLiveClass`.
  - Threaded `actorId` (already resolved via `getCurrentAdminId()`) through the 8 corresponding server actions; added `*PageInput = Omit<*Input, "actorId">` types where the action's exported input was the raw use-case input, so pages can't (and don't need to) pass `actorId` themselves.
  - Wired `recordAuditLog` into all 8 use case constructors in both `buildProductionContainer()` and `buildTestContainer()`.
  - 16 new tests (2 per use case: audit entry recorded on success, audit entry recorded on failure) across the 8 existing use-case test files. Full suite: 2258 passed, 2 skipped (was 2242). `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` all clean.

### 2026-07-22: E2E cleanup helper fix, `fix(test): construct clearE2EUsers' PrismaClient with a driver adapter`

- `tests/e2e/helpers/seed.ts`'s `clearE2EUsers()` constructed `new PrismaClient()` with no arguments. This codebase runs Prisma 7 with driver adapters (`prisma/schema.prisma`'s `datasource` has no `url`; the real connection is supplied via `PrismaPg` + `pg.Pool`, see `src/infra/database/prisma.ts`), so the bare constructor always threw `PrismaClientInitializationError`, on every run, regardless of `DATABASE_URL`. The helper's own try/catch (written to tolerate a missing `DATABASE_URL` in CI workers without failing `afterEach`) silently swallowed this too, so the E2E user cleanup between runs never actually happened.
- Fixed by building the client the same way the production singleton does. Verified against the locked-in contract in `tests/unit/e2e-helpers/clearE2EUsers.test.ts` (empty/malformed URL still no-ops, doesn't throw): still 4/4 passing.
- Also added an opt-in `PLAYWRIGHT_CHROMIUM_PATH` env var to `playwright.config.ts` (`undefined` when unset, zero effect on CI) so a sandboxed environment without network access for the pinned Playwright browser download can point at whatever Chromium is already on disk.
- Re-ran the full `chromium-desktop` E2E suite (stale since 2026-07-19, last measured 17 failed / 7 passed) against a freshly provisioned local Postgres: **15 passed, 4 intentionally skipped, 0 failed**. `pnpm typecheck`/`lint`/`test` all clean.

### 2026-07-22: PrismaOrderRepository + PrismaAuditLog + PrismaSessionRepository close three P0-2 legs

- **PR #125** (merged as `f075fff`): `fix(payment): persist orders to Postgres via PrismaOrderRepository (P0-2)`
  - Orders were still wired to `InMemoryOrderRepository` in the production container, a real production bug: orders vanish on every cold start / redeploy, and a webhook hitting a different serverless instance could never find the order it needed to mark PAID
  - Added a `status` column to the `orders` table (migration `20260722000000_order_status`) carrying the domain `PaymentStatus` state machine. Previously only `paymongoStatus` existed, which has no DRAFT equivalent
  - Added `Order.hydrate()` to reconstruct entities from persisted rows without routing through the `mark*()` state-transition guards
  - Implemented `PrismaOrderRepository` (all `IOrderRepository` methods, no stubs) and wired it into `buildProductionContainer()`; the PayMongo webhook route already resolves `orderRepo` through `buildContainer()`, so it picks this up with no separate change
  - 41 new tests (`Order.hydrate()` + `PrismaOrderRepository`)
  - CodeRabbit review response: built the `orders.status` index with `CREATE INDEX CONCURRENTLY` in a separate, non-transactional migration instead of a lock-holding plain `CREATE INDEX`; added `PaymentStatus.isValid()` so `PrismaOrderRepository.mapRow()` rejects a corrupt/legacy persisted status instead of blindly casting it; reconciled stale test-count numbers in `SESSION-HANDOVER.md`. Optimistic locking on `update()` explicitly deferred, see `SESSION-HANDOVER.md`
- **PR #125**: `fix(admin): persist the audit trail via PrismaAuditLog (P0-2)`
  - Every admin write (course/module/lesson CRUD, refunds, discount codes, badges, simulators, live classes, impersonation) calls `RecordAuditLog`, which was silently writing to `InMemoryAuditLog` in production. The entire audit trail vanished on every redeploy, invisibly, since a failed audit write never fails the business operation by design
  - The `AuditLog` Prisma model already existed; only the adapter was a stub with a stale "table doesn't exist yet" comment
  - Implemented `PrismaAuditLog` mapping the domain `AuditLogEntry` onto the `audit_logs` table and wired it into `buildProductionContainer()`
  - 4 new tests
- **PR #125**: `fix(auth): persist sessions to Postgres via PrismaSessionRepository (P0-2)`
  - `sessionRepo` was still `InMemorySessionRepository` in production. Auth itself is unaffected (JWT verification is stateless), but `ResetPassword`'s "invalidate every session" call silently no-oped against an empty store after any redeploy
  - Implemented `PrismaSessionRepository` and wired it into `buildProductionContainer()`; `deleteById`/`deleteAllForUser` use `deleteMany` to preserve the port's documented idempotent-delete contract
  - 11 new tests
  - Unit + integration suite (all three fixes): 2156 passed / 2 skipped; architecture compliance suite: 406 passed. E2E not re-run this session (see `SESSION-HANDOVER.md` for its last known status)

### 2026-07-22: PrismaDiscountCodeRepository admin CRUD closes the DiscountCode leg of P0-2

- **PR #126** (merged as `c819b38`): `fix(admin): implement PrismaDiscountCodeRepository admin CRUD (P0-2 / STORY-050d)`
  - `listAll`/`findById`/`update`/`archive` were stubs, so `buildProductionContainer()` fell back to `InMemoryDiscountCodeRepository` for the entire repo even though `findByCode`/`create`/`incrementUsedCount` were already real
  - Added a nullable `archivedAt` column to `discount_codes` (migration `20260722010000_discount_code_archived_at` + a separate `CREATE INDEX CONCURRENTLY` migration, applying the lock-avoidance lesson from PR #125's review proactively this time)
  - Implemented the four stub methods matching `InMemoryDiscountCodeRepository`'s exact contract: `findById`/`listAll` hide archived codes, `findByCode` intentionally does not filter on `archivedAt`, `update` maps a duplicate-code conflict to `code_taken`
  - Wired `PrismaDiscountCodeRepository` into `buildProductionContainer()`
  - 24 new tests. Unit + integration suite: 2175 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response (2 rounds): skipped a request to add `deletedAt`/`createdById`/`updatedById` to `DiscountCode` (22 of 23 models in the real schema lack these fields; `docs/db-schema.md`'s "every mutable table" rule was never actually implemented, so this isn't a live rule this PR broke, and fixing it repo-wide is a separate story) and a repeated request to rewrite `CHANGELOG.md`/`SESSION-HANDOVER.md` in VA-friendly plain language (the voice guide scopes that rule to user-facing copy, not internal engineering docs; the org-level dashboard rule CodeRabbit cited on round 2 isn't checked into this repo). Fixed a genuinely stale "remaining P0-2 items" snapshot in `SESSION-HANDOVER.md` left over from before the DiscountCode work landed. Details in `SESSION-HANDOVER.md`

### 2026-07-22: PrismaLiveClassRepository closes the LiveClass leg of P0-2

- **PR #127** (merged as `18166e7`): `fix(admin): implement PrismaLiveClassRepository (P0-2 / STORY-050c)`
  - No `LiveClass` Prisma model existed at all, so `buildProductionContainer()` fell back to `InMemoryLiveClassRepository`: every admin-scheduled live class vanished on cold start / redeploy, and the `SendLiveClassReminders` cron pipeline (already backed by a real `sent_reminders` idempotency table) had nothing to iterate over
  - Added a `LiveClass` Prisma model + `Course.liveClasses` back-relation (migration `20260722020000_live_class`); brand-new table, so a plain `CREATE INDEX` is correct (no existing traffic to lock)
  - Implemented `PrismaLiveClassRepository` matching `InMemoryLiveClassRepository`'s exact contract: `listAll` excludes `cancelled` and sorts by `scheduledAt` ascending, `delete` is a soft status transition to `cancelled`, not a real row delete
  - Wired `PrismaLiveClassRepository` into `buildProductionContainer()`
  - 20 new tests. Unit + integration suite: 2189 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response: fixed a stale in-memory comment left over in `container.ts`; fixed `update()` silently dropping `instructorId` on a full-entity update (no live call path triggers it today, but it broke contract parity with `InMemoryLiveClassRepository`); added `isValidLiveClassStatus()` and used it in `mapRow()` instead of blindly casting a persisted status (same pattern as `PaymentStatus.isValid()` on PR #125). Skipped a third repeat of the "plain language for VAs" request. Details in `SESSION-HANDOVER.md`

### 2026-07-22: PrismaModuleRepository + PrismaLessonRepository close P0-2

- `fix(admin): implement PrismaModuleRepository + PrismaLessonRepository (P0-2 / STORY-048b / STORY-048c)`
  - `moduleRepo`/`lessonRepo` were the last two repositories still on `InMemory*` in `buildProductionContainer()`: every module/lesson created through the admin curriculum editor vanished on cold start / redeploy. Unlike the other P0-2 legs, this one wasn't blocked on a design decision, only on the schema: STORY-048b/048c had already shipped the domain entities, ports, use cases, and admin UI against `IModuleRepository`/`ILessonRepository`
  - Added `Module` and `Lesson` Prisma models (`courses.modules` back-relation, `Module.lessons` back-relation) via migration `20260722040000_module_lesson`; brand-new tables, so a plain `CREATE INDEX` is correct (no existing traffic to lock). Does not touch `Course.curriculum` (still JSON, still read by the public catalog pages): that migration remains the separate, larger refactor both stories flagged as out of scope
  - Implemented `PrismaModuleRepository` (new file) and `PrismaLessonRepository` (replacing its throw-on-every-method stub), both matching their `InMemory*` counterparts' exact contract, including the atomic `reorder()` (validates the input id set matches the current rows before applying via `$transaction`). `mapRow()` on both reuses the existing `createModule()`/`createLesson()` domain factories (the latter also re-validates `type`/`content` shape) instead of adding new validators, so a corrupt/legacy row throws and surfaces as `db_error`, same pattern as the SimulatorScenario/LiveClass fixes
  - Wired both into `buildProductionContainer()`, removing the stale "in-memory until the schema migration lands" comments
  - 29 new tests (`PrismaModuleRepository.test.ts`, `PrismaLessonRepository.test.ts`, hand-rolled fake-`PrismaClient` pattern). Unit + integration suite: 2242 passed / 2 skipped; architecture compliance suite: 406 passed. `pnpm tsc --noEmit`, `pnpm lint`, `pnpm build` all clean
  - This closes P0-2: every repository in `buildProductionContainer()` is now Postgres-backed

### 2026-07-22: PrismaSimulatorScenarioRepository closes the SimulatorScenario leg of P0-2

- **PR #128** (merged as `e7e15dd`): `fix(admin): implement PrismaSimulatorScenarioRepository (P0-2 / STORY-050b)`
  - Same shape as the LiveClass fix: no `SimulatorScenario` Prisma model existed, so `buildProductionContainer()` fell back to `InMemorySimulatorScenarioRepository`: every admin-created practice scenario vanished on cold start / redeploy
  - Added a `SimulatorScenario` Prisma model + nullable `archivedAt` column (migration `20260722030000_simulator_scenario`); brand-new table, plain `CREATE INDEX` is correct
  - Implemented `PrismaSimulatorScenarioRepository`; `mapRow()` reuses the existing `createSimulatorScenario()` domain factory (which already validates `simulatorId`/`difficulty`) instead of adding a third near-identical validator, so a corrupt/legacy row throws and surfaces as `db_error`
  - Wired `PrismaSimulatorScenarioRepository` into `buildProductionContainer()`
  - 24 new tests. Unit + integration suite: 2213 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response: fixed a stale in-memory comment left over in `container.ts`; synced this changelog entry and `SESSION-HANDOVER.md`'s header with the actual PR #128 number/status. Skipped a request to add `deletedAt`/`createdById`/`updatedById` to `SimulatorScenario` (same reasoning as `DiscountCode` on PR #126: 24 of 25 models in the real schema now lack these fields, so this is a repo-wide gap, not a live rule this PR broke). Details in `SESSION-HANDOVER.md`

### 2026-07-19 — TDD + SOLID audit and Tier A production-bug fixes

- **PR #66** — `fix(catalog): close Tier A production bugs + lazy-init Resend`
  - 4 production bugs fixed: `/courses` catalog always empty, `/courses/[slug]` always 404'd, `enroll` action never persisted, PayMongo webhook 404'd. All caused by `new InMemory*()` in production code.
  - Lazy-init `ResendEmailSender` (was throwing at module load on empty `RESEND_API_KEY`; now defers to first `send()`)
  - 15 new tests (was 917, now 932)
- **PR #65** — `refactor(auth): eliminate hand-rolled JWT verify + module-load env capture`
  - 3 SOLID violations fixed: `SESSION_COOKIE` captured at module load (now per-call), hand-rolled JWT verify in `revokeCertificate.action.ts` (now `getSessionUserId`), hand-rolled JWT verify in `quiz attempt/route.ts` (now `getSessionUserId`)
  - 23 new tests
- **PR #64** — `refactor(migration): migrate 11 files to @/components/ui + CSS Modules`
  - 11 page/component files migrated from Tailwind-style classes to design system
  - Promoted `local/no-tailwind-classes` from `warn` to `error`
  - 3 new tests
- **PR #63** — `feat(eslint): local/no-tailwind-classes rule`
  - New custom ESLint rule banning Tailwind utility classes
  - 25 new tests (the rule itself)
- **PR #62** — `refactor(auth): strict TDD + strict SOLID for SignIn/SignOut`
  - 39 new tests for `performSignUp`, `performLogout`, `performRevokeCertificate`
  - Fixed try/catch bug in signup action that swallowed `navigate()` throw

**Tier status at session end:**

- Tier A (production bugs): ✅ closed
- Tier B (TDD coverage gaps): ❌ open — 12 use cases + 11 repos have no tests
- Tier C (SOLID hygiene): ❌ open — 8 `any` casts, 3 unused eslint-disable, Middleware → Proxy
- Tier D (dead code): ❌ open — 3 use cases with no callers

See `SESSION-TDD-SOLID-AUDIT.md` for full details and `NEXT-SESSION-PROMPT.md` for the next session's starting state.

## [Unreleased]

### 2026-07-17 — Repo bootstrap on `projectamazonph/amph-v2-greenfield`

- Created public repo `projectamazonph/amph-v2-greenfield` from the greenfield doc set.
- Repo settings: description, homepage `https://github.com/projectamazonph/amph-v2`, 16 topics (`amph`, `amazon-ppc`, `filipino-va`, `nextjs16`, `prisma7`, `paymongo`, `resend`, `solid`, `clean-architecture`, `hexagonal-architecture`, `domain-driven-design`, `typescript`, `vitest`, `playwright`, `sentry`, `documentation`), squash-only merge, auto-delete branches on merge, issues + discussions on, wiki + projects off.
- Added `LICENSE` (proprietary), `CODEOWNERS`, `CONTRIBUTING.md`, `.gitignore`, `.github/CODE_OF_CONDUCT.md`, `.github/SECURITY.md`, `.github/PULL_REQUEST_TEMPLATE.md`, three issue templates (`bug_report`, `feature_request`, `story`).
- Added `.github/workflows/ci.yml` (quality + unit + e2e + build jobs; PostgreSQL service container; Sentry + gitleaks wired).
- Added `.github/dependabot.yml` (weekly grouped npm + GitHub Actions updates; ignore rules for `typescript`, `eslint`, `next`, `react`, `react-dom` major bumps based on the legacy repo's toolchain lessons).
- Initial commit author reset to `Ryan Roland Dabao <projectamazonph@gmail.com>` to match the GitHub account.

### 2026-07-17 — Greenfield documentation set

- Wrote the full documentation tree for the greenfield, SOLID-layered build: `README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `SESSION-HANDOVER.md` (initial skeleton), and the `docs/` set (`product-brief.md`, `decisions.md`, `build-spec.md`, `business-layer.md`, `db-schema.md`, `api-reference.md`, `admin-backend.md`, `voice-guide.md`, `design-brief.md`, `ai-removal.md`, `sprint-plan.md`).
- Established the five-layer architecture in docs: `domain/`, `ports/`, `usecases/`, `infra/`, `app/`, with `composition/` as the DI container. Documented as ADRs 013–019 in `docs/decisions.md`.
- Documented the SOLID contract: one class per file, one port per concern, `Result<T, E>` across boundaries, `Money` value object, `Fake*` per port, ESLint boundary rule. See `docs/build-spec.md` §"The SOLID contract" and `AGENTS.md` §"SOLID contract".

### 2026-07-17 — Architecture decisions (ADRs 013–019)

- ADR-013: SOLID five-layer architecture over the existing ad-hoc `lib/` + `engine/` split. Accepted. The five layers: `domain/`, `ports/`, `usecases/`, `infra/`, `app/`, plus `composition/` for DI.
- ADR-014: `Result<T, E>` over thrown exceptions across layer boundaries. Accepted. Reduces coupling, makes failure paths explicit, trivially testable.
- ADR-015: Single-tenant only. No `orgId` column. ADR closed (carries over from legacy `amph-v2`).
- ADR-016: ESLint boundary rule that blocks framework / IO imports from `domain/`, `ports/`, and `usecases/`. Accepted. The mechanical enforcement of DIP.
- ADR-017: Composition root + `AsyncLocalStorage` request container. Accepted. No global singletons; the container is built per request in middleware.
- ADR-018: `Money` value object, integer minor units (centavos). No `number` for money downstream of PayMongo responses. Accepted. Eliminates the float-as-money class of bugs.
- ADR-019: Simulator registry pattern. New simulator = one domain module + one registry entry. No edits to the tools page, access policy, or API. Accepted. The OCP showcase.

### 2026-07-17 — Initial port catalog

- `src/ports/repositories/` — `UserRepository`, `CourseRepository`, `EnrollmentRepository`, `PaymentRepository`, `RefundRepository`, `AttemptRepository`, `ProgressRepository`, `BadgeRepository`, `LiveClassRepository`, `CertificateRepository`, `AuditLogRepository`, `DiscountCodeRepository`. One per table, ISP-compliant.
- `src/ports/gateways/` — `PaymentGateway`, `EmailSender`. Each with a `Fake*` implementation under `src/infra/<concern>/fake/`.
- `src/ports/services/` — `AccessPolicy`, `PdfRenderer`, `PricingService`, `CertificateIssuer`, `RateLimiter`, `ContentRenderer`, `StreakService`, `XPService`, `ProgressService`.
- `src/ports/system/` — `Clock`, `IdGenerator`, `Logger`, `Tracer`, `EventBus`. Each with a real and a test impl.

### 2026-07-17 — Use case catalog (first cut)

- `src/usecases/auth/` — `SignUp`, `SignIn`, `SignOut`, `RequestPasswordReset`, `ResetPassword`, `VerifyEmail`, `ResendVerification`.
- `src/usecases/checkout/` — `StartCheckout`, `HandlePaymentWebhook`.
- `src/usecases/enroll/` — `EnrollStudent`, `RevokeEnrollment`.
- `src/usecases/refund/` — `RequestRefund`, `AdminIssueRefund`.
- `src/usecases/certificate/` — `IssueCertificate`, `VerifyCertificate`, `RevokeCertificate`.
- `src/usecases/simulators/` — `RunBidElevator`, `RunStrTriage`, `RunCampaignBuilder`, `RunListingAudit`, `RunKeywordResearch`. One per simulator, all sharing the same shape.
- `src/usecases/progress/` — `MarkLessonComplete`, `RecordQuizAttempt`, `RecordStreakVisit`, `RecordSimulatorAttempt`.
- `src/usecases/badges/` — `AwardBadge`, `RevokeBadge`, `ListUserBadges`.
- `src/usecases/admin/` — `AdminUpdateUser`, `AdminCreateDiscountCode`, `AdminUpdateCourse`, `AdminUpdatePricingSettings`.

### 2026-07-17 — Initial infra adapters

- `src/infra/db/Prisma*Repository.ts` — one per repository port. Mappers between Prisma rows and domain entities live here, never in `domain/`.
- `src/infra/paymongo/PayMongoGateway.ts` + `fake/FakePayMongoGateway.ts` — wraps the PayMongo SDK, returns `Result<T, E>`, maps centavos.
- `src/infra/email/ResendEmailSender.ts` + `fake/ConsoleEmailSender.ts` — wraps Resend, renders React Email templates.
- `src/infra/pdf/ReactPdfRenderer.ts` — certificate and receipt rendering, escapes user input.
- `src/infra/observability/{PinoLogger,SentryTracer}.ts` — structured logging and error tracking.
- `src/infra/ratelimit/UpstashRateLimiter.ts` + `fake/InMemoryRateLimiter.ts` — Redis-backed rate limiting with a deterministic in-memory fake for tests.
- `src/infra/db/inmemory/InMemory*Repository.ts` — one per repository port, for use case tests.

### 2026-07-17 — Composition

- `src/composition/container.ts` — `buildContainer()` and `buildTestContainer()`. The only file that knows concrete types.
- `src/composition/requestContainer.ts` — `AsyncLocalStorage` wrapper, set up in `middleware.ts`.

### 2026-07-17 — Documentation (this set)

- `docs/product-brief.md` — what we are building, who it is for, the value proposition.
- `docs/decisions.md` — every ADR, 001 through 020.
- `docs/build-spec.md` — the engineering build spec, layer by layer.
- `docs/business-layer.md` — pricing, checkout, refunds, receipts.
- `docs/db-schema.md` — every Prisma model.
- `docs/api-reference.md` — every port method, every use case I/O, every server action, every route.
- `docs/admin-backend.md` — every admin route, every guard, every audit-log event.
- `docs/voice-guide.md` — banned phrases, sentence-level rules.
- `docs/design-brief.md` — the Field Manual design direction, tokens, type system.
- `docs/ai-removal.md` — what AI used to do, and what replaced it.
- `docs/sprint-plan.md` — 12 sprints, story by story.
- `docs/sprint-1/PLAN.md` — Sprint 1 plan: foundation + first vertical slice.
- `docs/stories/STORY-001.md` through `STORY-010.md` — the first 10 stories.
- `docs/security/tenant-isolation.md` — the isolation guard table.

---

## [Pre-greenfield] — Legacy `amph-v2` (sprints 1–12, retained for reference)

The pre-greenfield `amph-v2` (Next.js 16 + Prisma + PayMongo, 12 sprints shipped) remains the codebase being replaced. Its changelog entries (Sprints 1–12, commits, hotfixes) live at `https://github.com/projectamazonph/amph-v2/blob/main/CHANGELOG.md` for historical reference. This repo starts fresh: the changelog above is the greenfield truth.
