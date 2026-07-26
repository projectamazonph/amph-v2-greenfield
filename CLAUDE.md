# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Project Amazon PH Academy (AMPH) — an Amazon PPC training platform for Filipino virtual assistants. Next.js 16 modular monolith built on a SOLID five-layer architecture, solo-developer project, single Postgres database, single Vercel deploy. Three paid course tiers, five interactive PPC practice tools (simulators), gamification (XP/badges/certificates), and an admin panel (`src/app/admin/`).

Read `AGENTS.md` first — it's the terse rules file this document expands on. `docs/decisions.md` has the ADRs behind every non-obvious architectural choice referenced below (e.g. "ADR-013" for the five-layer split, "ADR-016" for the ESLint boundary rule).

## The five layers (one paragraph each)

- `src/domain/` — pure business model: entities (`src/domain/entities/` — `User`, `Course`, `Enrollment`, `Order`, `Quiz`, `QuizAttempt`, `Badge`, `BadgeAward`, `Certificate`, `DiscountCode`, `ProgressEvent`, `XPEvent`, `Session`, `SimulatorScenario`), value objects (`src/domain/values/` — `Money`, `CourseAccessTier`, `PaymentStatus`, `AccessDecision`, `OrderRefund`), the `Result<T, E>` sum type (`src/domain/shared/Result.ts`), pure domain services (`src/domain/services/` — `XPService`, `StreakService`, `ProgressService`), and the four simulators (`src/domain/simulator/<name>/`). Imports nothing from `next`, `prisma`, `paymongo`, `resend`. Lint-enforced.
- `src/ports/` — interfaces only, organized by concern (`repositories/`, `payment/`, `email/`, `access/`, `security/`, `system/`, `rendering/`, `simulator/`). Every method returns `Promise<Result<T, E>>`. Naming is inconsistent across the codebase — some ports are `I`-prefixed (`IPaymentGateway`, `IAccessPolicy`, `IEnrollmentRepository`, `IDiscountCodeRepository`, `ICertificateRepository`, etc.), others are not (`UserRepository`, `CourseRepository`, `SessionRepository`, `Clock`, `IdGenerator`, `EmailSender`, `CertificateRenderer`). Match the existing sibling file's convention when adding a new one rather than "fixing" the mix.
- `src/usecases/` — one class per use case, flat under `src/usecases/` (not nested per feature): `SignUp`, `Login`, `CreatePaymentIntent`, `CheckCourseAccess`, `EnrollStudent`, `ApplyDiscountCode`, `GetCourse`, `ListCourses`, `MarkLessonComplete`, `RecordQuizAttempt`, `RecordStreakVisit`, `AwardXP`, `AwardBadge`, `ListUserBadges`, `IssueCertificate`, `RenderCertificatePdf`, `VerifyCertificate`, `RevokeCertificate`, `RequestRefund`. Constructor-injects the ports it needs (usually via a single options object). No IO happens here — only `await` calls on injected dependencies and pure logic.
- `src/infra/` — adapters that implement the ports, organized by concern (`repositories/`, `payment/`, `email/`, `security/`, `pdf/`, `access/`, `system/`, `simulator/`, `database/`). Real adapters: `PrismaUserRepository`, `PrismaCourseRepository`, `PrismaOrderRepository`, `PrismaEnrollmentRepository`, `PayMongoAdapter`, `ResendEmailSender`, `ReactPdfCertificateRenderer`, `Argon2PasswordHasher`, `JoseJwtService`, `UlidGenerator`. Every port also has an `InMemory*` / `Stub*` / `Fake*` fake used by tests; `buildProductionContainer()` in `src/composition/container.ts` is the ground truth for which concrete adapter backs which repo in production — check it directly rather than assuming. The only layer that imports from `next`, `@prisma/client`, `paymongo`, `resend`.
- `src/app/` — Next.js App Router. Server components by default. Server actions live in `src/app/actions/*.ts` (thin: parse, call a use case, return the `Result`). Route handlers exist only for webhooks (`src/app/api/webhooks/paymongo/route.ts`) and small internal APIs (`src/app/api/health`, `src/app/api/quizzes/[quizId]/attempt`). `src/middleware.ts` sits in front of everything: security headers, route protection for `/dashboard`, `/admin`, `/enroll`, `/order`, and JWT session verification via `JoseJwtService`.

`src/composition/container.ts` is the only file that knows about every layer. It exports `buildContainer()` (production, cached singleton) and `buildTestContainer()` (in-memory fakes) from the same file — there is no separate `testContainer.ts`. It also owns the `AsyncLocalStorage`-based request scope (`runWithContainer()` / `getContainer()`); there is no separate `requestContainer.ts`. Path aliases are defined per-layer in `tsconfig.json` (`@domain/*`, `@ports/*`, `@usecases/*`, `@infra/*`, `@app/*`, `@composition/*`, `@lib/*`), but in practice almost all existing code imports via the generic `@/*` alias (e.g. `@/domain/shared/Result`, `@/infra/repositories/PrismaUserRepository`) rather than the layer-specific ones — follow that convention.

## Known gaps (don't assume otherwise)

As of 2026-07-26 (post audit-hardening pass — see `docs/audit-2026-07-26-hardening-review.md` and `SESSION-HANDOVER.md` for what changed) the items below are the current verified gaps. Several claims that used to live in this section — `src/lib/`/`src/components/` not existing, no admin panel, `courseRepo`/`orderRepo` on in-memory repos, the PayMongo webhook bypassing the container, only one migration, DB "not provisioned", `Course.curriculum` drifting from `Module`/`Lesson`, `SignUp.ts` not writing an audit entry, no persistent webhook event log, no admin 2FA, no admin-specific login route — are **no longer true**, fixed in the audit-hardening PR series (#186–#190 and the 2FA follow-up). Re-verify against the code before trusting either version.

- `Order.status`, `Order.paymongoStatus`, `LiveClass.status`, and `EmailLog.status` are plain `String` fields, not Prisma enums (`Enrollment.status`/`QuizAttempt.status` are now validated on read via `isEnrollmentStatus()`/`isQuizAttemptStatus()`, but still stored as `String` — a deliberate choice over a risky enum migration, see PR #188's description). `Role`, `SubscriptionTier`, `VerificationStatus`, and `SimulatorAccess` _are_ proper enums.
- Admin 2FA is opt-in TOTP (`/admin/settings` → "Enable two-factor authentication", confirmed via `/admin/settings/2fa-setup`) — `User.twoFactorSecret`/`twoFactorEnabled` (secret never exposed on the `User` domain entity, same treatment as the password hash), `TotpService` port (`OtpauthTotpService` real / `FakeTotpService` test), `EnableTwoFactor`/`ConfirmTwoFactor`/`DisableTwoFactor` use cases, and an optional `totpCode` on `Login`. Existing admins are unaffected until they opt in themselves. There is still no _enforcement_ that admins use 2FA — nothing requires it.
- **Session/account revocation does not work the way the schema implies.** `src/lib/auth.ts`'s `getSessionUserId()`/`getSessionUser()` (the only session-check path, used by every page via `requireAuth`/`requireAdmin`) verifies the JWT's signature/expiry and re-fetches the `User` row, but never queries the `sessions` table and never reads `User.lockedUntil`/`User.failedLoginCount`. Deleting a `sessions` row or setting `lockedUntil` does **not** revoke an already-issued JWT cookie — only a role change (checked fresh from the DB on every request) or a full `JWT_SECRET` rotation (logs out everyone) has any real effect. See `docs/runbooks/admin-access-recovery.md` for the verified workaround.
- There IS a dedicated admin login route (`/admin-login` → `/api/auth/admin-login`, checks `role === "ADMIN"` before allowing in) alongside the regular `/login` — an admin session works the same regardless of which route created it, since `requireAdmin()` just checks the session's `role`.
- `package.json`'s `db:seed:admin` script now points at a real `scripts/seed-admin-user.mjs` (creates or promotes a `role = 'ADMIN'` user, Argon2-hashed via the same params as `Argon2PasswordHasher`, idempotent by email) — see `docs/runbooks/admin-access-recovery.md` for usage and the SQL-based alternative.
- `docs/runbooks/` now has 4 real runbooks (`paymongo-outage.md`, `webhook-replay.md`, `db-backup-restore.md`, `admin-access-recovery.md`) alongside the still-stub ones listed in `docs/runbooks/README.md`. The DB restore runbook documents the correct Neon PITR mechanism but has never actually been drilled — treat its exact steps/timing as unverified until someone runs it for real.
- The `docs/build-spec.md` container example (`Container` type with `logger`, `tracer`, `events`, `pricing`, etc.) is the target design, not the current `AppContainer` shape — the real interface is smaller today; read `src/composition/container.ts` for ground truth.

## Curriculum and content

`content/curriculum/` and `scripts/import-amph-content.ts` exist and are in active use — this is no longer aspirational. Voice rules: `docs/voice-guide.md` (enforced in part by the `no-restricted-syntax` ESLint rule that bans "leverage", "delve", etc.).

## Architecture in detail

- `docs/build-spec.md` — full engineering build spec: layer by layer, what goes where, ESLint rules, testing strategy. Some of it (the container shape, `requestContainer.ts`) describes the target design rather than the current code — see "Known gaps" above.
- `docs/decisions.md` — every ADR, with status, context, decision, consequences (ADR-001 through at least ADR-022 as of 2026-07-26 — check the file for the current count; ADRs 013–019 cover the SOLID architecture). `docs/adr/` also holds standalone numbered ADR files (e.g. `0026-lighthouse-ci-disabled.md`) using a different numbering scheme than `docs/decisions.md` — don't assume the two are the same sequence.
- `docs/api-reference.md` — every port method, every use case input/output/error, every server action, every route handler.
- `docs/db-schema.md` — every Prisma model, every field, every index (20 models currently in `prisma/schema.prisma`: `User`, `Session`, `Course`, `Enrollment`, `Order`, `PpcCampaign`, `AuditLog`, `EmailLog`, `DiscountCode`, `XPEvent`, `ProgressEvent`, `UserStreak`, `Quiz`, `QuizQuestion`, `QuizOption`, `QuizAttempt`, `QuizAttemptAnswer`, `Badge`, `BadgeAward`, `Certificate`).
- `docs/security/tenant-isolation.md` — who can read what, per query.
- `docs/business-layer.md`, `docs/admin-backend.md`, `docs/design-brief.md`, `docs/product-brief.md` — business rules, planned admin panel, visual design system, product framing.

## Design Context

`PRODUCT.md` (register, users, positioning, brand personality, anti-references) and `DESIGN.md` (colors, typography, elevation, components, do's/don'ts) at the repo root are the machine-readable design context consumed by the `impeccable` skill (`/impeccable craft`, `critique`, `audit`, `polish`, `live`, etc.) — read them before any design/UI task. Register is `product` for the whole app, with `src/app/page.tsx` (the landing page) noted as the one brand-register exception. `.impeccable/design.json` is a sidecar with tonal ramps and rendered component snippets; `.impeccable/live/config.json` configures `/impeccable live`'s in-browser variant mode.

## Simulators

Four of the five planned simulators exist under `src/domain/simulator/<name>/` (input type, output type, a class implementing the `Simulator<TIn, TOut>` port with an async `run()`, score 0–100): `bid-elevator`, `campaign-builder`, `listing-audit` (also covers keyword research), `str-triage`. They're registered in `src/infra/simulator/buildSimulatorRegistry.ts` against `SimulatorRegistry`; unregistered simulator slots use `StubSimulator`. When adding a new one, mirror the existing four exactly (see `SESSION-HANDOVER.md` for the established pattern) — don't edit the tools page or access policy to wire it in.

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
- Do not assume a repo wired into `buildProductionContainer()` is Postgres-backed — check; `courseRepo` and `orderRepo` currently are not (see "Known gaps").

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
