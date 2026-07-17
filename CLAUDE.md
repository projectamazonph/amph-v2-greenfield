# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Project Amazon PH Academy (AMPH) — an Amazon PPC training platform for Filipino virtual assistants. Next.js 16 modular monolith built on a SOLID five-layer architecture, solo-developer project, single Postgres database, single Vercel deploy. Three paid course tiers, five interactive PPC practice tools (simulators), gamification (XP/badges/certificates), and an admin panel.

Read `AGENTS.md` first — it's the terse rules file this document expands on. `docs/decisions.md` has the ADRs behind every non-obvious architectural choice referenced below (e.g. "ADR-013" for the five-layer split, "ADR-016" for the ESLint boundary rule).

## The five layers (one paragraph each)

- `src/domain/` — pure business model. Entities (`Course`, `Enrollment`, `Payment`, `BidRecommendation`), value objects (`Money`, `Tier`, `Email`), pure functions (`recommendBids`, `canAccessCourse`). Imports nothing from `next`, `prisma`, `paymongo`, `resend`. Lint-enforced.
- `src/ports/` — interfaces only. `PaymentGateway`, `EmailSender`, `CourseRepository`, `Clock`, `IdGenerator`, `AccessPolicy`, `PdfRenderer`, `SimulatorRegistry`. Every method returns `Promise<Result<T, E>>`. Each port has a `Fake*` implementation under `src/infra/<concern>/fake/` for tests.
- `src/usecases/` — orchestration. One class per use case (`StartCheckout`, `HandlePaymentWebhook`, `EnrollStudent`, `IssueCertificate`, `RunBidElevator`). Constructor-injects the ports it needs. No IO happens here — only `await` calls on injected dependencies and pure logic.
- `src/infra/` — adapters that implement the ports. `PrismaCourseRepository`, `PayMongoGateway`, `ResendEmailSender`, `ReactPdfRenderer`, `SentryTracer`, `PinoLogger`. The only layer that imports from `next`, `@prisma/client`, `paymongo`, `resend`, `@sentry/*`.
- `src/app/` — Next.js App Router. Server components by default. Server actions are 5-line shims: parse with Zod, call a use case, return the `Result`. Route handlers exist only for webhooks.

`src/composition/container.ts` is the only file that knows about every layer. It builds the real container in production and `buildTestContainer()` in tests.

## Curriculum and content

The learning content is planned and audited in `docs/`. MDX lessons and the quiz fixture live in `content/curriculum/` (`modules/` + `quiz-questions.json`), and `scripts/import-amph-content.ts` reads from that repo-relative path.

Key content docs:
- `docs/CONTENT-AUDIT-2026-07-16.md` — content audit: critical P0/P1 issues, release plan.
- `docs/CURRICULUM-REDESIGN.md` — target 3-course model, module map, assessments, production order.
- `docs/VIDEO-EXPLAINER-SCRIPTS.md` — 8 short video explainer scripts for the Foundations launch.
- `docs/0-1-welcome-to-amph.md` — Module 0 lesson 1 (welcome / work loop).
- `docs/1-1-read-ppc-data-before-you-change-it.md` — Module 1 lesson 1 (Big Six metrics decision lesson).

When writing or importing lessons, follow the lesson-production standard in `docs/CURRICULUM-REDESIGN.md` and the voice rules in `docs/voice-guide.md`.

## Architecture in detail

- `docs/build-spec.md` — full engineering build spec: layer by layer, what goes where, ESLint rules, testing strategy.
- `docs/decisions.md` — every ADR, with status, context, decision, consequences. ADRs 013–019 cover the SOLID architecture.
- `docs/api-reference.md` — every port method, every use case input/output/error, every server action, every route handler.
- `docs/db-schema.md` — every Prisma model, every field, every index.
- `docs/security/tenant-isolation.md` — who can read what, per query.

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
pnpm sentry:sourcemaps
```

## Adding a new feature (the recipe)

1. Read `docs/build-spec.md` §"Adding a feature" once. Then forget it. The folder structure tells you where things go.
2. If it has business rules, start in `src/domain/<feature>/`. Tests next to the file. 100% branch coverage.
3. If it touches the outside world, define a port in `src/ports/<concern>/`. Write a `Fake*` in `src/infra/<concern>/fake/`.
4. If it orchestrates, write a use case in `src/usecases/<feature>/`. Constructor-inject. Return `Result`.
5. If it shows up, add a server action in `src/app/actions/<feature>.ts` (parse, call, return) and/or a page in `src/app/(dashboard)/...`.
6. Wire it in `src/composition/container.ts`. Add to `buildTestContainer()`.
7. Add a story in `docs/stories/STORY-XXX.md` with acceptance criteria and DoD.
8. Conventional commit, reference the story ID. `pnpm tsc && pnpm lint && pnpm test` must be green.

## What not to do

- Do not import from `next/*`, `@prisma/*`, `paymongo`, `resend`, or `@sentry/*` inside `src/domain/`, `src/usecases/`, or `src/ports/`. The ESLint boundary rule will fail the build.
- Do not use `number` for money anywhere downstream of a PayMongo response. Use `Money` from `src/lib/Money.ts`.
- Do not throw exceptions across layer boundaries. Return `Result.err(...)`.
- Do not mock the real Prisma client in unit tests. Use `InMemory*Repository` from `src/infra/db/inmemory/`.
- Do not add a 6th simulator by editing the tools page or the access policy. Add a domain module + registry entry. OCP.

## Session start checklist

1. `git pull --rebase origin main` to get the latest handoff.
2. Read `SESSION-HANDOVER.md` for current status, last commit, last sprint.
3. Read `docs/sprint-plan.md` for the active sprint.
4. Read any `docs/stories/STORY-XXX.md` for the story you are picking up.
5. If you are taking over mid-sprint, read the most recent entries in `SESSION-HANDOVER.md` "Daily log" section.
