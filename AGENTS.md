# AGENTS.md — Project Amazon PH Academy v2

Conventions for AI coding assistants and developers working on this codebase.

---

## The Six Rules

1. **Zero AI features.** No `openai`, `anthropic`, `langchain`, or any LLM API. No mentor chat, no AI mistake analysis. ADR-003.
2. **One icon set.** Phosphor (light) only. No Heroicons, no Lucide.
3. **One font pairing.** Space Grotesk + JetBrains Mono. No Inter, no system fonts in product UI.
4. **Server actions for mutations.** Reserve API routes for webhooks, file uploads, third-party.
5. **Every admin action logs to AuditLog.** No exceptions.
6. **Dependency direction is inward.** `app/`, `infra/`, `composition/` import from `ports/`. `usecases/` import from `ports/` and `domain/`. `domain/` and `ports/` import nothing from `app/`, `infra/`, or any framework. Enforced by ESLint boundary rules. ADR-016.

## The Voice

Direct, plain-spoken, Filipino VA audience. No jargon without definition. No AI-slop phrases. See `docs/voice-guide.md`. The ESLint rule `local/no-ai-slop` enforces banned phrases in CI.

## The Design System

Field Manual. Dense, scannable, utilitarian. Off-white surface. Orange accent (#FF6B35). Type-led hierarchy. No glassmorphism, no gradient orbs, no decorative blurs. See `docs/design-brief.md`.

## The Architecture

Five layers, dependency direction always inward:

```
app/         → usecases/ → ports/ ← infra/
              domain/  (no imports from anywhere else)
```

- `domain/` — entities, value objects, pure business rules. No `next`, no `prisma`, no `node-fetch`.
- `ports/` — interfaces only. Every method returns `Promise<Result<T, E>>`.
- `usecases/` — one class per use case. Constructor-injected ports.
- `infra/` — adapters implementing ports. Prisma repos, PayMongo gateway, Resend sender, React PDF renderer, Sentry tracer, Pino logger.
- `app/` — Next.js App Router. Server components by default. Server actions are 5-line shims to usecases. Route handlers exist only for webhooks and third-party callbacks.
- `composition/` — the DI container. The one place that knows concrete types.

See `docs/build-spec.md` and `docs/decisions.md` (ADRs 013–019).

## The Database

PostgreSQL (dev + production). Schema uses no SQLite-specific features. Every mutable table has `deletedAt`, `createdById`, `updatedById`. See `docs/db-schema.md`.

## The Business Layer

PayMongo for payments (one-time, Philippine peso, GCash/Maya/card/bank). Three pricing tiers. Refund window 7 days. Tax-compliant receipts. See `docs/business-layer.md`.

## The Admin Panel

`/admin/*` gated by `requireAdmin()`. Every route has search, filter, pagination. Every mutation is audited. See `docs/admin-backend.md`.

## The Curriculum

Lessons live in `content/curriculum/modules/` (MDX). Quiz fixtures in `content/curriculum/quiz-questions.json`. `scripts/import-amph-content.ts` reads from those paths (repo-relative, never device paths). Target structure: three courses (PPC Foundations, Accelerated Mastery, Ultimate Transformation) per `docs/CURRICULUM-REDESIGN.md`. Voice: `docs/voice-guide.md`. Reference lessons: `docs/0-1-welcome-to-amph.md`, `docs/1-1-read-ppc-data-before-you-change-it.md`.

## Code Style

- TypeScript strict. No `any`. Define types or use `unknown` with narrowing.
- Server components by default. `'use client'` only when needed.
- No `console.log` in committed code. Use the structured logger (`src/infra/observability/PinoLogger.ts`).
- No comments that restate the code. Comment the why, not the what.
- File names: `kebab-case.ts` for non-component files, `PascalCase.tsx` for components.
- Money is never a `number`. Use the `Money` value object (`src/lib/Money.ts`).
- Errors cross boundaries as `Result<T, E>`, not thrown exceptions. Throw only for programmer errors (invariant violations).
- Every port has at least one fake implementation for tests. No mocking the real adapter.

## Testing

- Vitest for unit + integration.
- Playwright for E2E.
- Tests live next to the code they test: `foo.ts` → `foo.test.ts`. Use `buildTestContainer()` from `src/composition/testContainer.ts` for usecase tests.
- Coverage thresholds enforced in CI: 70% on `src/domain`, `src/usecases`, and `src/lib`.
- Domain functions: 100% branch coverage. They are pure; there is no excuse.
- Every use case has tests with a fake gateway, fake repos, and a `FixedClock`.

## Commits

- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- One concern per commit. Don't mix refactor + feature.
- Reference story IDs: `feat(admin): user list table (STORY-027)`.
- Always `git commit` after work. Never leave uncommitted changes.

## Branching

- `main` — production-ready
- `feat/*` — feature branches
- `fix/*` — bugfix branches
- Branch off `main`, PR back to `main`.
- Squash merge.

## CI Requirements (build fails if any of these fail)

- `pnpm tsc --noEmit` — zero type errors
- `pnpm lint` — zero ESLint errors (includes `local/no-ai-slop` and boundary rules)
- `pnpm test` — all tests pass
- `pnpm test:coverage` — coverage above threshold
- `pnpm test:e2e` — Playwright suite passes
- `pnpm build` — production build succeeds
- Lighthouse CI — performance budget met
- `gitleaks detect` — no secrets in diff

## File Dependency Chain

```
src/lib/         ← Pure utilities (Result, Money, format). No deps.
   ↑
src/domain/      ← Entities + value objects + business rules. No external deps.
   ↑
src/ports/       ← Interfaces. Depend on domain types only.
   ↑
src/usecases/    ← Orchestration. Depend on ports + domain.
   ↑
src/infra/       ← Adapters. Implement ports. Depend on Prisma, PayMongo, etc.
   ↑
src/composition/ ← DI container. Wires infra into usecases.
   ↑
src/app/         ← Next.js routes + server actions. Thin.
   ↑
src/components/  ← UI primitives. Depend on app, lib.
```

Lower layers must not import from higher layers. The ESLint boundary rule blocks this at lint time. ADR-016.

## SOLID Contract

The five SOLID principles are enforced by the directory structure, not by code review:

- **S (SRP):** one class per file. Use cases orchestrate; they do not implement IO. Repositories own one table each.
- **O (OCP):** new payment gateway = new adapter implementing `PaymentGateway`. New simulator = new domain module + registry entry. No edits to the orchestrator.
- **L (LSP):** every port has a `Fake*` implementation in `src/infra/*/fake/`. The fake and the real must honor the same postconditions, documented in the port's JSDoc.
- **I (ISP):** repositories are split per use case, not one god `PrismaClient`. `EnrollmentRepository` is not `UserRepository`.
- **D (DIP):** `domain/` and `usecases/` never import from `next`, `prisma`, `paymongo`, `resend`, or `@sentry/*`. ESLint blocks it.

See `docs/build-spec.md` for the full contract and `docs/decisions.md` ADR-013 for the rationale.

## Don't Do

- Don't add dependencies without updating `package.json` and `pnpm-lock.yaml`.
- Don't use `fetch` directly in components. Use server actions.
- Don't store secrets in code. Use env vars.
- Don't commit `.env*` files. `.env.example` is allowed.
- Don't use emojis in code or commit messages.
- Don't use em-dashes. Use periods, commas, parentheses.
- Don't write generic AI-slop copy. The ESLint rule catches most, but read `voice-guide.md` for the full rules.
- Don't ship code without tests for new features (admin and business layer are mandatory).
- Don't ignore the AuditLog. Every admin mutation logs.
- Don't import `prisma`, `next/cache`, `paymongo`, `resend`, or `@sentry/*` from `src/domain/`, `src/usecases/`, or `src/ports/`. The ESLint boundary rule will fail the build.
- Don't use `number` for money. Use the `Money` value object.
- Don't throw exceptions across layer boundaries. Return `Result.err(...)`.
- Don't add a 6th simulator by editing the tools page. Add a domain module and a registry entry.
- Don't mock the real Prisma client in tests. Use `InMemory*Repository` from `src/infra/db/inmemory/`.

## On Errors

When something breaks:

1. Read the actual error. Don't guess.
2. Reproduce in the smallest possible test.
3. Fix root cause, not symptom.
4. Add a test that would have caught this.
5. Commit fix + test together.

## Adding a New Feature (Recipe)

1. **Model the domain.** Add entities and value objects in `src/domain/<feature>/`. No imports from `app/` or `infra/`. Write tests.
2. **Define the port(s).** Add interfaces in `src/ports/<concern>/`. Document postconditions. Write a `Fake*` implementation.
3. **Write the use case.** Add a class in `src/usecases/<feature>/`. Constructor-inject the ports. Use `Result<T, E>`. Test with `buildTestContainer()`.
4. **Implement the adapter (if needed).** In `src/infra/<concern>/`. Wrap the real SDK. Map to/from domain types.
5. **Wire it.** Add to `src/composition/container.ts`. Add to `buildTestContainer()` if relevant.
6. **Expose it.** Add a server action in `src/app/actions/<feature>.ts` (5 lines: parse, call, return) or a page in `src/app/(dashboard)/...`.
7. **Add a story.** `docs/stories/STORY-XXX.md`. Acceptance criteria. Definition of Done.

## Memoria Protocol

This repo uses Memoria for cross-agent context. Tag memories with:
- `project:amph-v2`
- `phase:1` (analysis), `2` (planning), `3` (solutioning), `4` (implementation), `5` (enrichment)
- `agent:dusk` (this instance)

Other agents (Atlas on phone OpenClaw, Vader on phone Hermes) share the same memoria server. Leave notes for them on handoffs.
