# Project Brief — Project Amazon PH Academy v2

**Project:** Project Amazon PH Academy v2 (greenfield rebuild)
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17
**Status:** Approved (build phase)

---

## What This Is

A paid training platform where Filipino virtual assistants learn Amazon advertising through structured courses, interactive tools, gamified learning, and downloadable resources.

This is a **greenfield rebuild** of the existing `amph-v2` (sprints 1–12 shipped), with the same product surface and the same content, but a new internal architecture: a five-layer SOLID monolith (`domain/`, `ports/`, `usecases/`, `infra/`, `app/`, plus `composition/` for DI). The user-facing experience is unchanged. The internals are deliberately different — the legacy architecture made it painful to add new payment providers, new simulators, and new admin tools, and the new structure is built to make those additions cheap.

## Why This Exists

Filipino VAs working in the Amazon advertising niche can charge ₱60k–₱80k/month. The training to get there is fragmented, expensive, or English-only with no Filipino context. This platform closes that gap.

The rebuild exists because the legacy architecture accreted enough ad-hoc coupling that adding the second-tier course or the third payment provider took longer than the first. The new architecture makes those additions one-file changes.

## Audience

**Primary:** Filipino virtual assistants, age 22–40, earning ₱15k–₱30k/month, looking to specialize.

**Secondary:** Existing PPC specialists wanting to expand into Amazon. Agency staff upskilling. Self-paced learners who prefer practice over video.

**Not the audience:** People outside the Philippines. People already at ₱80k+/month (they're competitors, not customers).

## Value Proposition

Three courses. One outcome: the VA becomes the Amazon ads specialist clients retain at ₱60k–₱80k/month.

Unlike competitors, this platform:
- Speaks the audience's language (real ₱ amounts, real cities, real VA scenarios)
- Practices with real tools (Campaign Builder, Bid Elevator, STR Triage, Listing Audit, Keyword Research simulators)
- Earns certifications recognized in the ProjectAmazonPH hiring pipeline

## Pricing Tiers

| Tier | Price | What they get |
|------|-------|---------------|
| **PPC Foundations** | ₱2,999 | 5 core modules, basic tools (Campaign Builder, Bid Elevator, STR Triage), quizzes, badges, community access |
| **Accelerated Mastery** | ₱5,999 | Everything in Foundations + advanced modules (8 total), all scenario packs, downloadable resources, live class recordings |
| **Ultimate Transformation** | ₱9,999 | Everything in Mastery + weekly live classes with Ryan, 1-on-1 portfolio review, private community channel, certificate priority review |

## Key Features

1. **Course Curriculum** — structured Amazon Ads training
2. **Campaign Builder** — interactive campaign structure tool
3. **Bid Elevator** — bid optimization practice
4. **Search Term Triage** — keyword analysis practice
5. **Listing Audit** — listing-quality checklist practice (Mastery+)
6. **Keyword Research** — seed-term expansion (Mastery+)
7. **Badges** — gamified achievements
8. **Certificates** — course completion certificates with verification
9. **Live Classes** — scheduled sessions with Ryan (Ultimate tier)
10. **Resources** — downloadable templates and guides

## What This Is Not

- Not a marketplace. Ryan owns the content.
- Not multi-tenant. Single organization.
- Not AI-powered. Zero external AI APIs (ADR-003).
- Not a CMS. Content ships with the app.
- Not multi-language. English UI with Filipino cultural references in copy.
- Not microservices. Modular monolith, single deploy (ADR-001).
- Not subscription-based. One-time payment per tier (ADR-009).

## Success Metrics

| Metric | Target | How measured |
|--------|--------|--------------|
| First-30 enrollments | 30 within 14 days of launch | `Enrollment` rows, early-bird tier |
| Refund rate | <5% within 7 days | `Refund` rows / `Payment` rows |
| Course completion (Foundations) | >40% reach certificate | `Enrollment.percentComplete = 100` rows / `Enrollment` rows |
| Simulator engagement | >60% of enrollees run ≥1 simulator | `SimulatorAttempt` distinct user count |
| LCP (mobile) | <2.5s at p75 | Lighthouse CI |
| Crash-free sessions | >99.5% | Sentry |
| Time to add a new simulator | <1 day, 1 file in `domain/` + 1 registry entry | PR cadence + LOC delta |

## Scope Cut From v2

| Cut | Why | When |
|-----|-----|------|
| Tagalog / Cebuano i18n | Audience prefers English with Filipino context. No demand yet. | v2.1, ADR-020 |
| Mobile app | Mobile-first web is enough at current scale. | When MAU > 5,000 |
| Subscription billing | One-time fits the audience's mental model. | If/when retention demands it |
| Community forum | Discord already serves the community. | Never, unless Discord becomes a blocker |
| AI mentor / mistake analysis | ADR-003 bans external AI APIs. | Not planned |

## What the Rebuild Changes

| Concern | Legacy | Greenfield |
|---------|--------|------------|
| Architecture | Ad-hoc `lib/` + `engine/` + `app/actions/` | Five layers + DI container |
| Dependencies between layers | Implicit, by convention | Explicit, lint-enforced |
| Errors across layers | Exceptions, mostly | `Result<T, E>` |
| Money representation | `number` pesos | `Money` value object (integer centavos) |
| Payment provider | PayMongo hardcoded | `PaymentGateway` port, PayMongo adapter, `FakePayMongoGateway` for tests |
| Adding a new simulator | Edit tools page, access policy, route, scenarios, type, registry | One domain module + one registry entry |
| Adding a new admin page | Edit admin layout, layout, route, server action | One server action + one page; use cases unchanged |
| Tests | Many skipped "we trust the real SDK" | Every port has a `Fake*`; every use case has a `buildTestContainer()` test |
| Mocking the DB | Mock Prisma client | `InMemory*Repository` per port |

The user-facing product is the same. The internals are the change.

## Risks

| Risk | Mitigation |
|------|------------|
| Greenfield slows Sprint 1 vs. the legacy equivalent | Sprint 1 is foundation + first vertical slice; subsequent sprints are faster. Net 12-sprint time is comparable. |
| Port proliferation becomes overhead | Ports are thin interfaces, not god objects. Per-table repos are 30-line files. The cost is bounded. |
| `Result<T, E>` ergonomics vs. throw | Standard library, two helpers (`map`, `flatMap`), a `combine` for parallel validation. One mental model, applied everywhere. |
| In-memory repos drift from real Prisma behavior | Mappers live in one place (`src/infra/db/Prisma*Repository.ts`). Integration tests against real Postgres in CI catch drift. |
| ESLint boundary rule gets in the way | If it blocks a real need, the answer is "add a port", not "disable the rule." Five-rule rule, no exceptions. |
