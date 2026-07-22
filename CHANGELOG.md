# Changelog

All notable changes to Project Amazon PH Academy v2 are documented here.

## [Unreleased]

### 2026-07-22 — PrismaOrderRepository closes the Order leg of P0-2

- **PR TBD** — `fix(payment): persist orders to Postgres via PrismaOrderRepository (P0-2)`
  - Orders were still wired to `InMemoryOrderRepository` in the production container — a real production bug: orders vanish on every cold start / redeploy, and a webhook hitting a different serverless instance could never find the order it needed to mark PAID
  - Added a `status` column to the `orders` table (migration `20260722000000_order_status`) carrying the domain `PaymentStatus` state machine — previously only `paymongoStatus` existed, which has no DRAFT equivalent
  - Added `Order.hydrate()` to reconstruct entities from persisted rows without routing through the `mark*()` state-transition guards
  - Implemented `PrismaOrderRepository` (all `IOrderRepository` methods, no stubs) and wired it into `buildProductionContainer()`; the PayMongo webhook route already resolves `orderRepo` through `buildContainer()`, so it picks this up with no separate change
  - 41 new tests (`Order.hydrate()` + `PrismaOrderRepository`), full suite 2131 passed / 2 skipped, architecture compliance suite 406 passed

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
