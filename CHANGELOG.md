# Changelog

All notable changes to Project Amazon PH Academy v2 are documented here.

## [Unreleased]

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

- `fix(admin): implement PrismaLiveClassRepository (P0-2 / STORY-050c)`
  - No `LiveClass` Prisma model existed at all, so `buildProductionContainer()` fell back to `InMemoryLiveClassRepository`: every admin-scheduled live class vanished on cold start / redeploy, and the `SendLiveClassReminders` cron pipeline (already backed by a real `sent_reminders` idempotency table) had nothing to iterate over
  - Added a `LiveClass` Prisma model + `Course.liveClasses` back-relation (migration `20260722020000_live_class`); brand-new table, so a plain `CREATE INDEX` is correct (no existing traffic to lock)
  - Implemented `PrismaLiveClassRepository` matching `InMemoryLiveClassRepository`'s exact contract: `listAll` excludes `cancelled` and sorts by `scheduledAt` ascending, `delete` is a soft status transition to `cancelled`, not a real row delete
  - Wired `PrismaLiveClassRepository` into `buildProductionContainer()`
  - 20 new tests. Unit + integration suite: 2189 passed / 2 skipped; architecture compliance suite: 406 passed
  - CodeRabbit review response: fixed a stale in-memory comment left over in `container.ts`; fixed `update()` silently dropping `instructorId` on a full-entity update (no live call path triggers it today, but it broke contract parity with `InMemoryLiveClassRepository`); added `isValidLiveClassStatus()` and used it in `mapRow()` instead of blindly casting a persisted status (same pattern as `PaymentStatus.isValid()` on PR #125). Skipped a third repeat of the "plain language for VAs" request. Details in `SESSION-HANDOVER.md`

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
