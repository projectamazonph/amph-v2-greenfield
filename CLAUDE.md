# CLAUDE.md

**Current addendum, 2026-08-12:** `main` is reviewed at `ee1737a`. PR #305 repaired the student journey and accessibility states. PR #306 fixed manually granted students by creating eligible published-course enrollments instead of changing only `subscriptionTier`. PR #307 fixed the admin-login redirect cookie. PR #308 fixed forgot-password links by normalizing the retired deployment origin to `https://projectamazonph.vercel.app`. The verified gate is 3,816 Vitest passed, 2 skipped; 665 architecture checks; TypeScript, ESLint, production build, Playwright, and Lighthouse passed. Read `docs/README.md` and `STATE.md` before relying on older addenda below.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Project Amazon PH Academy (AMPH) — an Amazon PPC training platform for Filipino virtual assistants. Next.js 16 modular monolith built on a SOLID five-layer architecture, solo-developer project, single Postgres database, single Vercel deploy. Three paid course tiers, five registered PPC simulator engines, gamification (XP/badges/certificates), and an admin panel (`src/app/admin/`).

Read `AGENTS.md` first — it's the terse rules file this document expands on. `docs/decisions.md` has the ADRs behind every non-obvious architectural choice referenced below (e.g. "ADR-013" for the five-layer split, "ADR-016" for the ESLint boundary rule).

## The five layers (one paragraph each)

- `src/domain/` — pure business model: entities (`src/domain/entities/` — `User`, `Course`, `Enrollment`, `Order`, `Quiz`, `QuizAttempt`, `Badge`, `BadgeAward`, `Certificate`, `DiscountCode`, `ProgressEvent`, `XPEvent`, `Session`, `SimulatorScenario`), value objects (`src/domain/values/` — `Money`, `CourseAccessTier`, `PaymentStatus`, `AccessDecision`, `OrderRefund`), the `Result<T, E>` sum type (`src/domain/shared/Result.ts`), pure domain services (`src/domain/services/` — `XPService`, `StreakService`, `ProgressService`), and the five simulators (`src/domain/simulator/<name>/`, including `keyword-research`). Imports nothing from `next`, `prisma`, `paymongo`, `resend`. Lint-enforced.
- `src/ports/` — interfaces only, organized by concern (`repositories/`, `payment/`, `email/`, `access/`, `security/`, `system/`, `rendering/`, `simulator/`). Every method returns `Promise<Result<T, E>>`. Naming is inconsistent across the codebase — some ports are `I`-prefixed (`IPaymentGateway`, `IAccessPolicy`, `IEnrollmentRepository`, `IDiscountCodeRepository`, `ICertificateRepository`, etc.), others are not (`UserRepository`, `CourseRepository`, `SessionRepository`, `Clock`, `IdGenerator`, `EmailSender`, `CertificateRenderer`). Match the existing sibling file's convention when adding a new one rather than "fixing" the mix.
- `src/usecases/` — one class per use case, some nested under feature subdirectories (`progress/`, `refund/`, `badges/`): `SignUp`, `Login`, `CreatePaymentIntent`, `CheckCourseAccess`, `EnrollStudent`, `ApplyDiscountCode`, `GetCourse`, `ListCourses`, `RecordQuizAttempt`, `AwardXP`, `AwardBadge`, `ListUserBadges`, `IssueCertificate`, `RenderCertificatePdf`, `VerifyCertificate`, `RevokeCertificate`. Constructor-injects the ports it needs (usually via a single options object). No IO happens here — only `await` calls on injected dependencies and pure logic.
- `src/infra/` — adapters that implement the ports, organized by concern (`repositories/`, `payment/`, `email/`, `security/`, `pdf/`, `access/`, `system/`, `simulator/`, `database/`). Real adapters: `PrismaUserRepository`, `PrismaCourseRepository`, `PrismaOrderRepository`, `PrismaEnrollmentRepository`, `PayMongoAdapter`, `ResendEmailSender`, `ReactPdfCertificateRenderer`, `Argon2PasswordHasher`, `JoseJwtService`, `UlidGenerator`. Every port also has an `InMemory*` / `Stub*` / `Fake*` fake used by tests; `buildProductionContainer()` in `src/composition/container.ts` is the ground truth for which concrete adapter backs which repo in production — check it directly rather than assuming. The only layer that imports from `next`, `@prisma/client`, `paymongo`, `resend`.
- `src/app/` — Next.js App Router. Server components by default. Server actions live in `src/app/actions/*.ts` (thin: parse, call a use case, return the `Result`). Route handlers exist only for webhooks (`src/app/api/webhooks/paymongo/route.ts`) and small internal APIs (`src/app/api/health`, `src/app/api/quizzes/[quizId]/attempt`). `src/proxy.ts` sits in front of everything: security headers, route protection for `/dashboard`, `/admin`, `/enroll`, `/order`, and JWT session verification via `JoseJwtService`.

`src/composition/container.ts` is the only file that knows about every layer. It exports `buildContainer()` (production, cached singleton) and the `AppContainer` type. **`buildTestContainer()` (in-memory fakes) lives in a separate file, `src/composition/container.test.ts`** — despite the `.test.ts` suffix, that file is not a Vitest spec (it has zero `describe`/`it` blocks); the suffix is a deliberate device to guarantee it's never imported by production code (see the file's own docblock). This corrects an earlier version of this doc that claimed both builders live in one file. It also owns the `AsyncLocalStorage`-based request scope (`runWithContainer()` / `getContainer()`); there is no separate `requestContainer.ts`. Path aliases are defined per-layer in `tsconfig.json` (`@domain/*`, `@ports/*`, `@usecases/*`, `@infra/*`, `@app/*`, `@composition/*`, `@lib/*`), but in practice almost all existing code imports via the generic `@/*` alias (e.g. `@/domain/shared/Result`, `@/infra/repositories/PrismaUserRepository`) rather than the layer-specific ones — follow that convention.

## Known gaps (don't assume otherwise)

**Addendum, 2026-08-04, part 2 (STORY-085 follow-up: missing UIs + a real grading bug fixed):** the two gaps STORY-085 originally left open are closed. `ListingAuditForm` now has a real edit → triage (fix/skip per finding) → grade flow, calling `listingAuditAttempt()` instead of stopping at the preview-only `auditListing()`. `CampaignBuilderForm` now has a real nested campaign/ad-group/keyword editor, submitting `userAdjustedCampaigns` so `campaignBuilderAttempt()` produces real `scoreDimensions`/feedback instead of always `null`. **Building this UI surfaced a real, pre-existing production bug, unrelated to STORY-085's own changes** (present since STORY-067/069/070): `GradeSimulatorAttempt` requires an attempt already in `"submitted"` status and `SubmitSimulatorAttempt` requires at least one saved decision, but bid-elevator and campaign-builder never called either before grading, and listing-audit called submit _after_ grading instead of before — every graded call to these three actions was silently failing in production (`attempt_not_submitted`/`no_decisions_made`), invisible to unit tests since they mock `gradeSimulatorAttempt.execute()` directly. Fixed in all three, with new regression tests asserting submit happens before grade.

**Addendum, 2026-08-04, part 1 (STORY-085, scenario publishing + versioning — full rewire):** `SimulatorScenario` now has a real `draft → published → archived` lifecycle with version history (`scenarioKey`/`version`/`status` fields, `PublishSimulatorScenario`/`CreateScenarioVersionDraft`/`ListScenarioVersions` use cases, admin UI at `/admin/simulators` + `/admin/simulators/[id]/versions`). All 5 simulator practice pages (`src/app/tools/<name>/page.tsx`) now fetch `container.scenarioRepo.findPublished(simulatorId)` server-side instead of importing a hardcoded `SCENARIO` const — publishing a new version through the admin UI actually changes what students see and get graded against. Each simulator's server action also now resolves its scenario server-side rather than trusting client-echoed data, closing a real trust gap in bid-elevator, str-triage, and listing-audit (all three used to accept the full scenario — economics, lexicons, category/niche — back from the client on submit). campaign-builder and bid-elevator's practice pages were switched from a legacy preview-only action (`buildCampaign()`, `runBidElevator()` — now deleted) to their existing but previously-unwired graded, persisted-attempt use cases (`campaignBuilderAttempt()`, `bidElevatorAttempt()`), so those two simulators now create a real `SimulatorAttempt` record for the first time. See `docs/stories/STORY-085.md` for the full breakdown (now updated with the part-2 follow-up above).

**Addendum, 2026-08-03 and 2026-08-16 (STORY-095.5, email templates):** editing an email template changes what Resend sends on all seven paths. Every `*Email.tsx` renderer accepts the shared `EmailTemplateOverride` type, and each triggering path (`ResendVerification`, `VerifyEmail`, `RequestPasswordReset`, `IssueCertificate`, `SendLiveClassReminders`, shared `sendRefundEmail()`, and PayMongo's `sendReceiptEmail()`) fetches `emailTemplateRepo.findByType(...)` and falls back to the original copy when no row exists. All four editable fields now accept only the listed type-specific `{{variables}}`; values resolve per recipient and invalid or malformed tokens are rejected before persistence. `RefundEmail` renders its CTA and links it to the student's dashboard. The shared polished HTML system also covers the non-editable password-changed and payment-failed messages; the latter remains available for provider-authoritative payment-failure events. The inbound Resend route now verifies the current Svix request signature before accepting an event. See `docs/stories/STORY-095.5.md`.

**Addendum, 2026-08-03 (STORY-100, live-class recording + XP):** `liveClassRegistrationRepo` is **no longer** `InMemoryLiveClassRegistrationRepository` in production — `buildProductionContainer()` now wires the real `PrismaLiveClassRegistrationRepository` (`src/infra/repositories/PrismaLiveClassRegistrationRepository.ts`), closing the gap the 2026-08-02 addendum below flags as "not touched, out of scope." RSVPs (and the new watched-recording XP-award guard) now survive cold start/redeploy. `LiveClass` also gained a `recordingUrl` field and `LiveClassRegistration` a `watchedRecordingAt` field (migration `20260803020000_live_class_recording`); see `docs/stories/STORY-100.md` for the full slice. Also fixed in passing: `buildTestContainer()` was wiring three separate fresh `InMemoryLiveClassRegistrationRepository()` instances for `listLiveClassesForStudent`/`rsvpLiveClass`/`cancelLiveClassRsvp` instead of sharing the one exposed on the test container — an RSVP made through one wasn't visible to the others in a test. All four (including the new `markLiveClassRecordingWatched`) now share one instance.

**Addendum, 2026-08-02 (production-readiness fix session):** the following were verified as real gaps against the source that day and fixed in the same session — re-verify against source before trusting anything older that contradicts these:

- **STORY-049.5 (PayMongo real refunds) is done.** `PayMongoAdapter.refund()` calls the real PayMongo Refunds API (`POST /v1/refunds`) instead of returning `not_implemented`. `ProcessRefund`/`RefundOverride` now actually work against production PayMongo, not just the in-memory stub.
- **Build-time crash without `DATABASE_URL` fixed.** `src/infra/database/prisma.ts` used to construct the Prisma client eagerly at module import time, which crashed `next build`'s page-data-collection step (and any CI/preview build) whenever `DATABASE_URL` wasn't set at build time, even though no request had been served. `prisma` is now a `Proxy` that only constructs the real client on first property access; `next build` succeeds with zero env vars set.
- **Admin email-template editor built (STORY-095):** `/admin/email-templates` (list) and `/admin/email-templates/[type]/edit` (upsert-by-type form), backed by new `ListEmailTemplates`/`GetEmailTemplate`/`UpdateEmailTemplate` use cases wired into both containers. The `EmailTemplate` domain entity, port, and both repo adapters already existed but were fully disconnected (no use cases, no container wiring, no page) before this. **Caveat, still open:** the actual email-sending renderers (`src/infra/email/templates/*.tsx`) do not read from this repository — editing a template here does not yet change what Resend actually sends. The edit page says so explicitly. Wiring the renderers to consult it is a real follow-up (STORY-095.5), deliberately not attempted in the same session as a production-critical email system (receipts, verification) to keep blast radius small.
- **Student 2FA opt-in built (STORY-097):** `/profile/security` (+ `/profile/security/2fa-setup`), reusing the same role-agnostic `EnableTwoFactor`/`ConfirmTwoFactor`/`DisableTwoFactor` use cases the admin flow already used (`src/app/actions/twoFactor.action.ts`'s `perform*` helpers), via a thin `studentTwoFactor.action.ts` with different redirect targets. Admin-only 2FA enforcement is still not a thing (see below).
- **Account deletion + data export built (STORY-096):** `/profile/data`. `UserRepository` gained `anonymizeAndDelete()` (scrubs email/name/phone/avatar/bio/password/2FA secret, stamps `deletedAt`; deliberately does NOT touch `Order`/`Enrollment`/`Certificate` rows — those keep the userId reference for tax/audit/verification survival). New `DeleteUserAccount` (password-confirmed, revokes all sessions, audits `user.account_deleted`) and `ExportUserData` (JSON download of profile + orders + enrollments + certificates + badge awards + XP events + progress events) use cases. **Known limitation, stated on the page itself:** the export does NOT include quiz or simulator attempt history — `IQuizAttemptRepository`/`ISimulatorAttemptRepository` only support per-quiz/per-scenario lookups, not "every attempt by this user," and adding that was out of scope for this pass. As a side effect of building this, `IProgressEventRepository`/`PrismaProgressEventRepository` (which already existed) got wired into the containers for the first time — it was previously unused dead wiring, same disconnected-port pattern as the email templates above.
- **Formative-only simulator labeling built (STORY-078):** a shared `FormativeScoreNotice` component ("Practice score only. Not a certification, job-readiness signal, or hiring credential.") now renders on all 5 simulators' result views (`BidElevatorResult.tsx` plus the other four `*Form.tsx` components), pinned by a regression test that fails if any one simulator's copy drops the import.
- **CSP header added** to `src/proxy.ts` alongside the existing X-Frame-Options/nosniff/Referrer-Policy/Permissions-Policy headers. It's a pragmatic first pass, not a hardened one: `script-src`/`style-src` still allow `'unsafe-inline'` because there's no nonce plumbing through the RSC payload or CSS-module inline styles yet — a nonce-based CSP is a real follow-up, not done here.
- **Found and fixed a silently-skipped test file.** `src/infra/payment/PayMongoAdapter.test.ts` (checkout session creation, webhook signature verification) sat directly in `src/infra/payment/`, not under a `__tests__/` folder — `vitest.config.ts`'s `include` glob only matches `src/**/__tests__/**/*.test.ts` and `tests/**/*.test.ts`, so this file was never executed by `pnpm test` or CI despite looking like normal test coverage. Moved to `src/infra/payment/__tests__/PayMongoAdapter.test.ts`. Worth a repo-wide sweep for other stray colocated `*.test.ts` files outside `__tests__/`/`tests/` — only this one was found this session, but it wasn't specifically searched for beyond a single `find`.
- **Explicitly not attempted this session, and why:** STORY-083 (non-binary Listing Audit ground truth) and STORY-084 (Campaign Builder strategic scoring) need Ryan's Amazon PPC subject-matter judgment, not an agent's guess — per `docs/sprint-plan.md`'s own note on those stories. A DB backup/restore drill needs a real, live Neon project and is destructive-adjacent — operator-owned. External uptime monitoring needs a third-party account. Admin 2FA _enforcement_ (vs. opt-in) is a security/UX policy call with real lockout risk for a solo-admin project — flagged, not decided unilaterally. `liveClassRegistrationRepo` is still `InMemoryLiveClassRegistrationRepository` in production (RSVPs lost on cold start/redeploy) per its own comment in `container.ts` — not touched this session, out of scope.

As of 2026-07-27 (see `docs/audit-2026-07-27-completeness-review.md` and `SESSION-HANDOVER.md`) the items below are the current verified gaps. Several claims that used to live in this section — `src/lib/`/`src/components/` not existing, no admin panel, `courseRepo`/`orderRepo` on in-memory repos, the PayMongo webhook bypassing the container, only one migration, DB "not provisioned", `Course.curriculum` drifting from `Module`/`Lesson`, `SignUp.ts` not writing an audit entry, no persistent webhook event log, no admin 2FA, no admin-specific login route, no runbooks, and a missing admin seed script — are no longer true. Re-verify against the source before trusting historical notes.

- **Completeness findings from the 2026-07-27 audit — SUPERSEDED, see the 2026-08-02 addendum above and the code:** the four graded simulator actions used `userId: "system"` and `GetAdminDashboardStats.pendingRefunds` was hardcoded to zero — both were fixed in a prior session (commit `915c7ca`, 2026-07-31), not this one. Quiz lesson rendering's placeholder was closed by STORY-094 (2026-08-01). `PrismaBadgeRepository.create/update/archive` are fully implemented (no longer stubs). The admin seed script uses the PrismaPg driver adapter correctly instead of constructing `PrismaClient` directly.
- Session revocation now checks `SessionRepository` when a `sessionId` is present in the JWT — if the session has been revoked server-side, the request is rejected even though the JWT itself has not expired.
- `Order.status`, `Order.paymongoStatus`, `LiveClass.status`, and `EmailLog.status` are plain `String` fields, not Prisma enums (`Enrollment.status`/`QuizAttempt.status` are validated on read via `isEnrollmentStatus()`/`isQuizAttemptStatus()`, but remain stored as `String`). `Role`, `SubscriptionTier`, `VerificationStatus`, and `SimulatorAccess` are proper enums.
- Admin 2FA is opt-in TOTP (`/admin/settings` → "Enable two-factor authentication", confirmed via `/admin/settings/2fa-setup`) — `User.twoFactorSecret`/`twoFactorEnabled` (secret never exposed on the `User` domain entity, same treatment as the password hash), `TotpService` port (`OtpauthTotpService` real / `FakeTotpService` test), `EnableTwoFactor`/`ConfirmTwoFactor`/`DisableTwoFactor` use cases, and an optional `totpCode` on `Login`. Existing admins are unaffected until they opt in themselves. There is still no _enforcement_ that admins use 2FA — nothing requires it.
- There IS a dedicated admin login route (`/admin-login` → `/api/auth/admin-login`, checks `role === "ADMIN"` before allowing in) alongside the regular `/login` — an admin session works the same regardless of which route created it, since `requireAdmin()` just checks the session's `role`.
- `package.json`'s `db:seed:admin` script now points at a real `scripts/seed-admin-user.mjs` (creates or promotes a `role = 'ADMIN'` user, Argon2-hashed via the same params as `Argon2PasswordHasher`, idempotent by email). See `docs/runbooks/admin-access-recovery.md` for usage and the SQL-based alternative.
- `docs/runbooks/` now has 4 real runbooks (`paymongo-outage.md`, `webhook-replay.md`, `db-backup-restore.md`, `admin-access-recovery.md`) alongside the still-stub ones listed in `docs/runbooks/README.md`. The DB restore runbook documents the correct Neon PITR mechanism but has never actually been drilled — treat its exact steps/timing as unverified until someone runs it for real.
- The `docs/build-spec.md` container example (`Container` type with `logger`, `tracer`, `events`, `pricing`, etc.) is the target design, not the current `AppContainer` shape — the real interface is smaller today; read `src/composition/container.ts` for ground truth.
- **Simulator scores are still not trustworthy for certification, job-readiness, or hiring signals.** The findings in `docs/audit-2026-07-26-simulator-accuracy-review.md` describe the pre-Sprint-14 state (hardcoded `explanation: 100`, unenforced weights-sum-to-1.0, dead `passingThreshold`) — that mechanical layer is now fixed (Sprint 14, STORY-071–077, PR #228): `explanation` is gone from `GradingDimension`, `reviewCoverage` is a non-gradable submission gate (`NON_GRADABLE_DIMENSIONS`), and policy validation runs on both the seed and hydration paths. Sprint 15's subject-matter rewrites are also in: Bid Elevator's economic model (STORY-079, PR #244), Listing Audit's rubric engine (STORY-080, PR #245 — merged, but its difficulty-scaled finding-volume acceptance criterion is not yet implemented, see the story doc), Keyword Research's versioned datasets (STORY-081, PR #246), and STR Triage's expanded classifier (STORY-082, PR #247) are all merged to `main`. **STORY-083 (non-binary Listing Audit ground truth) and STORY-084 (Campaign Builder strategic scoring) remain planned** — until STORY-083 lands, Listing Audit's `severity === "info" ? "skip" : "fix"` rule still means clicking "fix" on every finding is usually correct, so the click-through bypass is suppressed (not closed). STORY-078 (the UI-copy half — labeling every score as formative and never "certified"/"hiring ready") is done as of 2026-08-02: see the addendum above. Treat every simulator's score as formative only until Sprint 15 fully closes.

## Curriculum and content

`content/curriculum/` and `scripts/import-amph-content.ts` exist and are in active use — this is no longer aspirational. Voice rules: `docs/voice-guide.md` (enforced in part by the `no-restricted-syntax` ESLint rule that bans "leverage", "delve", etc.).

## Architecture in detail

- `docs/build-spec.md` — full engineering build spec: layer by layer, what goes where, ESLint rules, testing strategy. Some of it (the container shape, `requestContainer.ts`) describes the target design rather than the current code — see "Known gaps" above.
- `docs/decisions.md` — every ADR, with status, context, decision, consequences (ADR-001 through at least ADR-022 as of 2026-07-26 — check the file for the current count; ADRs 013–019 cover the SOLID architecture). `docs/adr/` also holds standalone numbered ADR files (e.g. `0026-lighthouse-ci-disabled.md`) using a different numbering scheme than `docs/decisions.md` — don't assume the two are the same sequence.
- `docs/api-reference.md` — current route, server-action, use-case, port, and runtime inventory. The source files define exact input and error types.
- `docs/db-schema.md` — current Prisma model inventory and known divergences (34 models and 20 migrations at the 2026-07-27 audit). `prisma/schema.prisma` remains authoritative for every field and index.
- `docs/security/tenant-isolation.md` — who can read what, per query.
- `docs/business-layer.md`, `docs/admin-backend.md` (admin panel structure), `docs/design-brief.md`, `docs/product-brief.md` — business rules, current admin panel reference, visual design system, product framing.

## Design Context

`PRODUCT.md` (register, users, positioning, brand personality, anti-references) and `DESIGN.md` (colors, typography, elevation, components, do's/don'ts) at the repo root are the machine-readable design context consumed by the `impeccable` skill (`/impeccable craft`, `critique`, `audit`, `polish`, `live`, etc.) — read them before any design/UI task. Register is `product` for the whole app, with `src/app/page.tsx` (the landing page) noted as the one brand-register exception. `.impeccable/design.json` is a sidecar with tonal ramps and rendered component snippets; `.impeccable/live/config.json` configures `/impeccable live`'s in-browser variant mode.

## Simulators

Five simulator engines exist under `src/domain/simulator/<name>/` and are registered in `src/infra/simulator/buildSimulatorRegistry.ts`: `bid-elevator`, `campaign-builder`, `listing-audit`, `str-triage`, and `keyword-research`. As of STORY-081 (PR #246), Keyword Research is its own registered simulator driven by a versioned `KeywordDataset` (resolved via `KeywordDatasetRepository` / `StaticKeywordDatasetRepository`, an in-code repository, not Prisma-backed) — it no longer reuses `ListingAuditSimulator.generateKeywords`. Only 4 of the story's 12 launch niches are curated so far, and every dataset is `synthetic_calibrated` (no real seller-export data yet), so credential-mode Keyword Research attempts are rejected pending STORY-081b. When adding a new engine, mirror the existing modules and update the registry. Simulator score limitations are documented in the two audit reports.

## Commands

```bash
pnpm dev                  # next dev
pnpm build                # next build
pnpm start                # next start
pnpm typecheck            # tsc --noEmit
pnpm lint                 # ESLint (boundary + voice)
pnpm test                 # Vitest (unit + integration)
pnpm test:watch
pnpm test:coverage
pnpm test:e2e             # Playwright
pnpm test:e2e:ui
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:studio
pnpm prisma:format
pnpm prisma:validate
pnpm gen:secret
pnpm format
```

To run a single test file: `pnpm vitest run path/to/File.test.ts`. Tests that exercise the composition container (Prisma-backed) need real env vars:

```bash
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run
```

Test files live in two places (both picked up by `vitest.config.ts`): colocated `__tests__/` folders next to the source (`src/**/__tests__/**/*.test.ts`, e.g. `src/domain/entities/__tests__/`) and a mirrored tree under `tests/unit/` (e.g. `tests/unit/domain/simulator/`). Coverage thresholds actually enforced by `pnpm test:coverage` (`vitest.config.ts`): 80% lines, 70% branches, 80% functions, 80% statements — `docs/build-spec.md`'s higher per-layer numbers (100% domain, 90% usecases) are the aspirational target, not the configured gate.

## Adding a new feature (the recipe)

1. Read `docs/build-spec.md` §"Adding a feature" once. Then forget it. The folder structure tells you where things go.
2. If it has business rules, start in `src/domain/`. Tests in a colocated `__tests__/` folder or `tests/unit/domain/...`. Domain functions should have full branch coverage — they're pure, there's no excuse.
3. If it touches the outside world, define a port in `src/ports/<concern>/`. Write an `InMemory*`/`Fake*` implementation in `src/infra/<concern>/`.
4. If it orchestrates, write a use case as a new file directly under `src/usecases/`. Constructor-inject the ports (an options object, following the existing use cases). Return `Result`.
5. If it shows up, add a server action in `src/app/actions/<feature>.ts` (parse, call, return) and/or a page/route under `src/app/`.
6. Wire it in `src/composition/container.ts` — both `buildProductionContainer()` and `buildTestContainer()`.
7. Add a story in `docs/stories/STORY-XXX.md` with acceptance criteria and DoD.
8. Conventional commit, reference the story ID. `pnpm tsc --noEmit && pnpm lint && pnpm test` must be green.

## What not to do

- Do not import from `next/*`, `@prisma/*`, `paymongo`, `resend`, or `server-only` inside `src/domain/`, `src/usecases/`, or `src/ports/`. The ESLint `no-restricted-imports` boundary rule (`eslint.config.mjs`) will fail the build.
- Do not import `@prisma/client` or `@infra/*` directly from `src/app/`. Go through the composition container or a server action.
- Do not use `number` for money anywhere downstream of a PayMongo response. Use `Money` from `src/domain/values/Money.ts`.
- Do not throw exceptions across layer boundaries. Return `Result.err(...)`. Throw only for programmer errors (invariant violations).
- Do not mock the real Prisma client in unit tests. Use the `InMemory*Repository` fakes in `src/infra/repositories/` (and `src/infra/payment/`, `src/infra/simulator/`, etc.).
- Do not add a 6th simulator by editing the tools page or the access policy. Add a domain module + registry entry. OCP.
- Do not assume a repo wired into `buildProductionContainer()` is complete just because a Prisma adapter exists. Check the adapter methods and the current audit report. (`PrismaBadgeRepository` mutation methods used to be stubs; they're fully implemented as of the 2026-07-27 audit cycle — don't rebuild them.) Conversely, do not assume a port with a real Prisma adapter is actually wired into the container just because the adapter file exists — `IEmailTemplateRepository`/`PrismaEmailTemplateRepository` and `IProgressEventRepository`/`PrismaProgressEventRepository` both sat fully unwired (no container entry at all) until the 2026-08-02 session fixed them. Grep `src/composition/container.ts` for the port name before assuming either way.

## Session start checklist

1. `git pull --rebase origin main` to get the latest handoff.
2. Read `SESSION-HANDOVER.md` for current status, last commit, last sprint.
3. Read `docs/sprint-plan.md` for the active sprint.
4. Read any `docs/stories/STORY-XXX.md` for the story you are picking up.
5. If you are taking over mid-sprint, read the most recent entries in `SESSION-HANDOVER.md` "Daily log" section.

<!-- ASTRYX:START -->

Astryx v0.1.8 · 153 components
CLI: run every command as `pnpm exec astryx <cmd>` (shown below as `astryx ...`).

SETUP (once, in your app entry e.g. main.tsx) — without these, components render unstyled:
import "@astryxdesign/core/reset.css";
import "@astryxdesign/core/astryx.css";

WORKFLOW — discover, don't guess. Before writing UI:

1. `astryx build "<idea>"` — START HERE: returns a kit (closest [page] + [block]s + [component]s). No args = full playbook.
2. `astryx template <name> [--skeleton]` — scaffold the [page]/[block]s it named, or study their layout. Templates are reference code.
3. `astryx component <Name>` — props + examples for every component you use.

RULES:

- No <div> — components do all layout/spacing. Full page → AppShell; sidebar nav → SideNav.
- Frame first: pick the shell (AppShell / Layout+LayoutPanel) and budget regions in px BEFORE writing content (`astryx docs layout`).
- Dense data = rows (Table, List/Item) edge-to-edge — never Card-wrapped list items. Card = dashboard widgets, galleries, settings groups only.
- Status → StatusDot/Token; Badge only for counts and enumerated states, never decoration.
- Custom styling: component props first; else style/className with tokens — var(--color-_|--spacing-_|--radius-*). No raw hex/px. (No StyleX/Tailwind compiler here — don't use xstyle/utility classes.)
- Tokens for every value (`astryx docs tokens`). Brand/accent via `astryx theme` — never override --color-* in :root.
- SELF-CHECK before you finish: re-read the file and replace any raw <div>/<span> layout, imported .css/@apply, or hardcoded value (#hex, 16px) with the component or a token (var(--color-_|--spacing-_|…)). If unsure a component/prop exists, run `astryx component <Name>` / `astryx search "<thing>"`; don't hand-roll CSS.

MORE CLI:
search "<query>" find any component / hook / doc / template / block
component --list 153 components by category
template --list page + block recipes
docs <topic> color, elevation, icons, illustrations, internationalization, layout, migration, motion, principles, shape, spacing, styling, theme, tokens, typography
swizzle <Name> eject component source for deep customization
upgrade --apply run after any @astryxdesign/core bump
<!-- ASTRYX:END -->
