# Project Amazon PH Academy v2

### Amazon PPC Training for Filipino Virtual Assistants

**Stop earning ₱15k/month. Start charging ₱60k–₱80k/month.**

Three courses. One outcome: become the Amazon ads specialist clients retain.

![Landing Page](docs/screenshots/landing.png)

---

## What is Project Amazon PH Academy?

Project Amazon PH Academy is an online training platform built specifically for Filipino virtual assistants who want to specialize in Amazon advertising. It's not a generic course site — every lesson, tool, and feature is designed around real-world Amazon PPC work.

You learn by doing. Interactive simulators let you practice with real campaign scenarios before touching a client's account.

---

## What's Inside

### Structured Courses

Three tiered courses, each building on the last:

| Course | What You Learn | Price |
|--------|---------------|-------|
| **PPC Foundations** | Amazon advertising basics, Sponsored Products, campaign structure, keyword research, bid management | ₱2,999 |
| **Accelerated Mastery** | Everything in Foundations + advanced strategies, Sponsored Brands, Sponsored Display, optimization frameworks | ₱5,999 |
| **Ultimate Transformation** | Everything in both courses + live classes, 1-on-1 support, portfolio-ready projects, job placement guidance | ₱9,999 |

**Early bird deal:** First 30 enrollees pay only ₱499 — full access, not a deposit.

![Course Detail](docs/screenshots/course-detail.png)

### Interactive Lessons

Each course breaks down into modules and lessons. You read, practice, and quiz your way through. Progress saves automatically — pick up where you left off on any device.

![Lesson View](docs/screenshots/lesson.png)

### Quizzes and Knowledge Checks

After each module, a quiz tests what you learned. Score above the passing threshold to unlock the next module. No guessing — each question targets a real skill.

![Quiz](docs/screenshots/quiz.png)

---

## Practice Tools

This is what makes AMPH different. Five interactive simulators let you practice Amazon PPC tasks with real data — no risk to client accounts.

### Campaign Builder

Build Sponsored Products, Sponsored Brands, and Sponsored Display campaigns step by step. Choose targeting, set bids, structure ad groups — the full workflow.

![Campaign Builder](docs/screenshots/campaign-builder.png)

### Bid Elevator

Upload your campaign data and get smart bid adjustment suggestions. See which keywords are over-spending and where to push bids up.

![Bid Elevator](docs/screenshots/bid-elevator.png)

### Search Term Triage

Sort search terms into Keep, Pause, or Optimize buckets. Learn to identify wasted spend and hidden opportunities in your search term reports.

![Search Term Triage](docs/screenshots/str-triage.png)

### Listing Audit

Audit a product listing against Amazon's best practices. Get a score and actionable fixes for titles, bullets, images, and backend keywords.

![Listing Audit](docs/screenshots/listing-audit.png)

### Keyword Research

Generate keyword ideas from a seed term. Get match-type recommendations, estimated bid ranges, and a starter negative keyword list.

![Keyword Research](docs/screenshots/keyword-research.png)

---

## Pricing Snapshot

| Item | Price |
|------|-------|
| PPC Foundations | ₱2,999 (one-time) |
| Accelerated Mastery | ₱5,999 (one-time) |
| Ultimate Transformation | ₱9,999 (one-time) |
| All-access pass | ₱12,999 (saves vs buying separately) |
| Early bird (first 30) | ₱499 any tier |
| Refund window | 7 days, full refund |
| Live classes | Ultimate tier only, weekly |
| Certificate | Free on course completion, verified by hash |

---

## Status

| Metric | Value |
|--------|-------|
| Architecture | Greenfield, SOLID-layered modular monolith |
| Tech stack | Next.js 16 App Router + TypeScript strict + Prisma 7 + PostgreSQL |
| Payment | PayMongo (PHP, GCash / Maya / card / bank) |
| Email | Resend (React Email) |
| Repo layout | `src/{domain,ports,usecases,infra,app,components,composition,lib}` |
| Test stack | Vitest (unit + integration) + Playwright (e2e) |
| First deploy | Pending — see `docs/sprint-1/PLAN.md` |
| Documentation | This file + `AGENTS.md` + `CLAUDE.md` + `FEATURES.md` + `docs/` |
| Last updated | 2026-07-17 |

---

## How to Read This Repo

If you are new, read in this order:

1. `AGENTS.md` — the rules. Short. Memorize.
2. `CLAUDE.md` — how an AI coding assistant should work in this repo.
3. `docs/product-brief.md` — what we are building and why.
4. `docs/decisions.md` — every non-obvious architectural choice, with reasons.
5. `docs/build-spec.md` — the engineering build spec, layer by layer.
6. `docs/business-layer.md` — payments, tiers, refunds.
7. `docs/db-schema.md` — the database, table by table.
8. `docs/api-reference.md` — every port, use case, server action, route.
9. `docs/sprint-plan.md` — the 12-sprint plan.
10. `SESSION-HANDOVER.md` — where the project actually is right now.

---

## Commands

```bash
# Install
pnpm install

# Develop
pnpm dev                  # Next dev server
pnpm typecheck            # tsc --noEmit
pnpm lint                 # ESLint (boundary rules + voice)
pnpm test                 # Vitest
pnpm test:watch
pnpm test:coverage
pnpm test:e2e             # Playwright
pnpm test:e2e:ui

# Database
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:studio
pnpm prisma:format
pnpm prisma:validate

# Build
pnpm build
pnpm start

# Other
pnpm gen:secret           # generate NEXTAUTH_SECRET-style random
pnpm format               # Prettier
pnpm sentry:sourcemaps
```

---

## Repo Layout (Top Level)

```
amph-v2/
├── src/
│   ├── domain/         # PURE. Entities, value objects, business rules.
│   ├── ports/          # Interfaces only. No implementations.
│   ├── usecases/       # Orchestrate ports. One class per use case.
│   ├── infra/          # Adapters. Prisma, PayMongo, Resend, Sentry, PDF.
│   ├── app/            # Next.js App Router. RSC, server actions, routes.
│   ├── components/     # UI primitives. Dumb. Receive props.
│   ├── composition/    # DI container + AsyncLocalStorage scope.
│   └── lib/            # Result, Money, Clock, IdGenerator, format helpers.
├── prisma/             # schema.prisma + migrations
├── content/            # MDX lessons, quiz fixtures, tool scenarios
├── tests/              # Unit + e2e (mirrors src/)
├── docs/               # This documentation tree
├── scripts/            # Build, seed, smoke, import scripts
└── public/             # Static assets
```

---

## License

Proprietary. © 2026 Project Amazon PH. All rights reserved.
