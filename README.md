# Project Amazon PH Academy v2

Amazon PPC training for Filipino virtual assistants.

Three courses, practical tools, and an Amazon PH simulator interface. The repository contains the Next.js application, Prisma schema and migrations, curriculum importer, payment integration, admin panel, and automated tests.

**Production:** <https://projectamazonph.vercel.app>. The retired `amph-v2-greenfield.vercel.app` origin must not be used for new links. Deployment configuration, database contents, payment webhooks, and live email delivery remain operator-owned checks.

![Landing Page](public/landing/academy-hero.png)

## What is included

- Authentication, email verification, password reset, optional admin TOTP, and student TOTP (`/profile/security`).
- First-run onboarding walkthrough (`/welcome`, STORY-146): 5-step client stepper (URL fragment + localStorage), "Pick your first course" dashboard variant for fresh free-tier students, sidebar "?" badge for users within their first 7 days, and a profile "Restart the welcome tour" button.
- Course catalog, MDX curriculum import, lessons, quizzes, XP, streaks, badges, and certificates.
- PayMongo checkout (including real refunds through the PayMongo Refunds API), webhook processing, enrollment, discount codes, and refund workflows.
- Five registered simulator implementations, each with a real draft → published → archived scenario lifecycle and version history, formative-only score labeling, and (for Listing Audit and Campaign Builder) a real edit/triage UI feeding graded, persisted attempts. Keyword Research is its own versioned-dataset engine.
- A student download center (`/resources`) — guides, templates, and automation tools, with admin CRUD, file upload (Vercel Blob in production), and access-tier gating — plus an embedded Amazon Ads Console page (`/tools/ad-console`).
- Live classes with admin CRUD, student RSVP, reminder emails, and post-class recording playback with one-time completion XP.
- Editable email templates (`/admin/email-templates`) that are actually wired into every Resend send path, not just a CRUD screen.
- Account data export and self-service account deletion (`/profile/data`).
- Student portfolio page (`/portfolio`) with learner artefacts (decision logs, mid-lesson retrieval checks, etc.), JSON export, and six-kind lifecycle (`STORY-135`); Foundations capstone brief + readiness checker (`STORY-142`/`STORY-143`).
- Targeted quiz remediation (`STORY-141`): missed questions surface a "What to revisit" list with lesson links.
- In-app notifications bell with unread count, 30s polling, dropdown and mark-read on click (`STORY-139`).
- Admin users, courses, modules, lessons, payments, refunds, scenarios (with version history), live classes, badges, resources, audit logs, email templates, and settings routes.
- PostgreSQL through Prisma 7, Resend email, Sentry configuration, Pino logging, Upstash rate limiting, and Vercel cron wiring.

See [`FEATURES.md`](FEATURES.md) for the implemented, partial, and planned feature matrix, and [`CLAUDE.md`](CLAUDE.md)'s "Known gaps" section for the most current, dated list of what's real versus still open. Simulator scores are formative and are not certification or hiring evidence yet — see [`docs/sprint-plan.md`](docs/sprint-plan.md) Sprints 14–16 for the remediation history, and [`docs/audit-2026-07-27-completeness-review.md`](docs/audit-2026-07-27-completeness-review.md) for the last full completeness audit (several of its findings have since been closed; check `CLAUDE.md` before trusting a claim from it in isolation).

## Curriculum and tools

The source curriculum is under `content/curriculum/`. Import it after applying migrations:

```bash
pnpm prisma:deploy
pnpm import:content
pnpm db:seed:tiers
```

The public catalog and pricing pages show empty-state copy until published course rows and active pricing-tier rows exist in the database.

Tool routes:

- `/tools/bid-elevator`
- `/tools/str-triage`
- `/tools/campaign-builder`
- `/tools/listing-audit`
- `/tools/keyword-research` (own registered simulator, STORY-081)
- `/tools/ad-console` — embedded Amazon Ads Console reference page (not a graded simulator)

Every simulator reads its practice content from a `SimulatorScenario` row that is currently `published` (admin-managed draft → published → archived lifecycle with version history, STORY-085) rather than a hardcoded constant, and every result view carries a formative-only notice (STORY-078) — treat all five scores as practice signal, not certification or hiring evidence.

![Bid Elevator](public/screenshots/bid-elevator.png)
![Campaign Builder](public/screenshots/campaign-builder.png)
![Search Term Triage](public/screenshots/str-triage.png)
![Listing Audit](public/screenshots/listing-audit.png)
![Keyword Research](public/screenshots/keyword-research.png)
![Welcome stepper](public/screenshots/welcome.png)
![NewUserDashboard variant](public/screenshots/new-user-dashboard.png)

> The five simulator screenshots and the landing-page hero are dated 2026-08-29. The two welcome / new-user-dashboard screenshots are placeholders pending a fresh capture — see [Updating screenshots](#updating-screenshots).

## 📚 Curriculum Syllabus

For a comprehensive overview of all courses, modules, and lessons taught by the platform, see **[CURRICULUM-SYLLABUS.md](CURRICULUM-SYLLABUS.md)**.

**Quick Overview:**

- **Total Duration:** ~45 hours of structured learning
- **Total XP:** ~2,700 points across 31 lessons
- **Two Main Courses:** PPC Foundations (Modules 0-4) and Accelerated Mastery (Modules 5-8)
- **Five Simulation Tools:** Bid Elevator, STR Triage, Campaign Builder, Listing Audit, Keyword Research
- **Assessment:** Module quizzes with 70% pass threshold + practical simulations

## Current repository status

| Metric                            | Verified state                                                                                                        |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Architecture                      | SOLID-layered modular monolith with a composition root                                                                |
| Framework                         | Next.js 16 App Router, TypeScript strict                                                                              |
| Database                          | PostgreSQL through Prisma 7, 60 models and 51 migrations                                                              |
| Payments                          | PayMongo adapter (checkout + real Refunds API) and `/api/webhooks/paymongo` route                                     |
| Email                             | Resend adapter with React Email templates, wired to admin-editable overrides                                          |
| Admin                             | `/admin/*` route tree gated by `requireAdmin()`, 12 sub-areas including resources                                     |
| Simulators                        | 5 registered engines with versioned/published scenarios and formative-only scoring                                    |
| Tests                             | Vitest unit and integration tests, Playwright E2E suite, a dedicated architecture-compliance suite (`pnpm test:arch`) |
| Latest repository commit reviewed | `918c532` on 2026-09-21 (PRs #520, #528-#539, #542-#545)                                                               |
| Verification                      | 5,133 Vitest passed, 3 skipped; 876 architecture checks; TypeScript, ESLint, build, Playwright, and Lighthouse passed   |
| Documentation review              | 2026-09-21. Start with `STATE.md` and `SESSION-HANDOVER.md`                                                           |

Sprints 1-15 are complete; learning-experience 8.5 Wave 1 (LEARN-010..015) and Wave 3 evidence slice (LEARN-031..035, LEARN-040..045) are also merged. Sprint 16 work (STORY-085, STORY-087, STORY-088) is complete; STORY-086 (instructor calibration) and STORY-089 (connected-account simulator) remain planned. The student onboarding slice (`STORY-146`) is the latest merged work via `PR #545`.

The 2026-09-21 documentation gate ran against `918c532`: 5,133 Vitest tests passed, 3 skipped; all 876 architecture checks passed; TypeScript, ESLint, the production build, Playwright, and Lighthouse passed.

## Planned work and known gaps

Not exhaustive — `CLAUDE.md`'s "Known gaps" section is the dated, actively-maintained source of truth; this is a summary for orientation.

**Planned, no code yet:**

- **STORY-086** — instructor calibration + acceptable-answer ranges for simulator grading. No story doc exists.
- **STORY-089** — a connected-account simulator variant. No story doc exists.

**Partial / real but incomplete:**

- **Keyword Research** dataset covers 4 of the story's 12 launch niches, and every dataset is `synthetic_calibrated` — credential-mode attempts are rejected pending real seller-export data (STORY-081b, unplanned).
- **Listing Audit's difficulty-scaled finding-volume** acceptance criterion (STORY-080) is not implemented.
- **Admin two-factor authentication** is opt-in. Login lockout and session-row revocation are enforced, but 2FA enrollment is not mandatory.
- **Local file storage** (`LocalFileStorage`, used when `BLOB_READ_WRITE_TOKEN` is unset) does not persist on Vercel's read-only serverless filesystem; production fails closed instead of silently falling back to it.

**Operator-owned, not delegable to an agent:**

- A live database backup/restore drill (a runbook exists; never executed against a real Neon project).
- External uptime monitoring (needs a third-party account).
- Launch communications.
- PayMongo live webhook secret rotation drills.

Historical audits and session entries are retained as records. For current status, use `STATE.md`, `FEATURES.md`, and the newest `SESSION-HANDOVER.md` entry.

## Read this repo in this order

1. [`AGENTS.md`](AGENTS.md), repository rules.
2. [`docs/README.md`](docs/README.md), documentation map and current-versus-historical rules.
3. [`STATE.md`](STATE.md), current production and repository state.
4. [`CLAUDE.md`](CLAUDE.md), coding-agent guidance and dated addenda.
5. [`FEATURES.md`](FEATURES.md), current feature status matrix.
6. [`docs/sprint-plan.md`](docs/sprint-plan.md), delivery plan and story status.
7. [`docs/product-brief.md`](docs/product-brief.md), product framing.
8. [`docs/decisions.md`](docs/decisions.md), accepted architectural decisions.
9. [`docs/build-spec.md`](docs/build-spec.md), engineering rules.
10. [`docs/business-layer.md`](docs/business-layer.md), payment and refund rules.
11. [`docs/db-schema.md`](docs/db-schema.md), schema inventory.
12. [`docs/api-reference.md`](docs/api-reference.md), route, action, and use-case inventory.
13. [`SESSION-HANDOVER.md`](SESSION-HANDOVER.md), newest operational handoff first.
14. [`CHANGELOG.md`](CHANGELOG.md), shipped-change history.

## Commands

```bash
# Install and develop
pnpm install
pnpm dev

# Required quality checks
pnpm typecheck
pnpm lint
set NODE_ENV=test&& pnpm test
pnpm test:arch
pnpm test:coverage
pnpm build

# Playwright
pnpm test:e2e
pnpm test:e2e:ui

# Database
pnpm prisma:generate
pnpm prisma:validate
pnpm prisma:migrate
pnpm prisma:deploy
pnpm prisma:studio
pnpm prisma:format

# Content and seed data
pnpm import:content
pnpm db:seed:admin
pnpm db:seed:tiers
pnpm db:seed:policies
pnpm db:seed:scenarios
pnpm db:seed:resources
pnpm gen:secret
pnpm format
```

On Windows, use `set NODE_ENV=test&&` for local Vitest runs when `.env` or `.env.local` sets `NODE_ENV=production`. Do not run seed commands against a production database without checking `DATABASE_URL` first.

## Repository layout

```text
src/
  domain/       Pure entities, value objects, rules, and simulator logic
  ports/        Interfaces
  usecases/     Application orchestration
  infra/        Prisma, PayMongo, Resend, security, PDF, and test adapters
  app/          Next.js pages, server actions, and route handlers
  components/   UI components
  composition/  Production and test dependency wiring
  lib/          Framework-facing helpers
prisma/         Schema and append-only migrations
content/        MDX curriculum and quiz fixtures
scripts/        Import and seed commands
tests/          Architecture, integration, unit, and E2E tests
docs/           Product, architecture, operations, stories, and audit records
public/         Brand assets and screenshots
```

## Updating screenshots

The screenshots under `public/landing/` and `public/screenshots/` are marketing collateral, not source of truth. When the UI changes materially, refresh the relevant PNGs by running the dev server locally (`pnpm dev`), signing in as a real user (admin for admin pages, fresh signup for the onboarding flow), and capturing with your OS screenshot tool.

Current coverage (refresh these when the UI changes):

| File | What it shows | Refresh when |
|------|---------------|--------------|
| `public/landing/academy-hero.png` | Public landing hero | Landing copy or hero illustration changes |
| `public/screenshots/bid-elevator.png` | Bid Elevator tool view | Bid Elevator form/result UI changes |
| `public/screenshots/campaign-builder.png` | Campaign Builder tool view | Campaign Builder UI changes |
| `public/screenshots/str-triage.png` | STR Triage tool view | STR Triage UI changes |
| `public/screenshots/listing-audit.png` | Listing Audit tool view | Listing Audit UI changes |
| `public/screenshots/keyword-research.png` | Keyword Research tool view | Keyword Research UI changes |
| `public/screenshots/welcome.png` | First-run `/welcome` stepper | Onboarding copy or stepper UI changes |
| `public/screenshots/new-user-dashboard.png` | `NewUserDashboard` variant | Dashboard variant copy or hero changes |

> Generated PNGs are not regenerated automatically. Update them as part of the PR that changes the UI, or file a follow-up issue if the diff is too large.

## License

Proprietary. © 2026 Project Amazon PH. All rights reserved.
