# Feature inventory

**Last reviewed:** 2026-07-27  
**Ground truth:** `src/`, `prisma/schema.prisma`, `scripts/`, and the current test suite.  
**Related audit:** `docs/audit-2026-07-27-completeness-review.md`

This file is a status inventory, not a list of promises. A route can be implemented while still requiring database seed data or an operator configuration step.

Status labels:

- **Implemented:** source and route exist, with automated coverage where applicable.
- **Partial:** a meaningful slice exists, but an integration, adapter, seed, or UX path is incomplete.
- **Planned:** design or story material exists, but the current application does not ship it.

## Implemented surfaces

### Authentication and access

| Capability                      | Current implementation                                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| Student signup                  | `/signup`, `signup.action.ts`, `SignUp`, Argon2id hashing                                         |
| Student login and logout        | `/login`, `/api/auth/login`, `/api/auth/logout`, `Login`, `Logout`                                |
| Admin login                     | `/admin-login`, `/api/auth/admin-login`                                                           |
| Email verification              | `/verify-email`, `/verify-email/sent`, verification action and route                              |
| Password reset                  | `/reset-password`, `/reset-password/[token]`, Resend email flow                                   |
| Role gate                       | `requireAdmin()` in `src/lib/auth.ts` and `src/app/admin/layout.tsx`                              |
| Admin two-factor authentication | Opt-in TOTP setup under `/admin/settings` and `/admin/settings/2fa-setup`                         |
| Rate limiting                   | Upstash adapter with in-memory test implementation; signup, login, and checkout actions are wired |

The current session guard validates the JWT and reloads the user. It does not consult the `sessions` table or `lockedUntil`; see the audit and `docs/runbooks/admin-access-recovery.md` before relying on session deletion as revocation.

### Courses and curriculum

- `/courses` lists published catalog rows from Postgres.
- `/courses/[slug]` renders course detail and module metadata.
- `/courses/[slug]/lessons/[lessonId]` renders MDX lesson content and navigation.
- `/courses/[slug]/lessons/[lessonId]/quiz` and `/api/quizzes/[quizId]/attempt` provide the dedicated quiz attempt flow.
- `scripts/import-amph-content.ts` imports the MDX curriculum under `content/curriculum/` into module and lesson rows.
- Admin course, module, and lesson CRUD is available under `/admin/courses`.

The public catalog and pricing pages deliberately render an empty-state message when no published course or active pricing rows have been seeded. The lesson renderer still displays a placeholder for quiz content in some lesson paths, so the lesson-to-quiz transition is not completely unified.

### Pricing, checkout, and refunds

- `/pricing` reads active `PricingTier` rows and displays early-bird values when configured.
- `/checkout`, `/checkout/success`, and `/checkout/failed` provide the student checkout flow.
- `PayMongoAdapter` creates hosted checkout sessions and verifies webhook signatures.
- `/api/webhooks/paymongo` records webhook events and processes payment state through the production container.
- `PrismaOrderRepository`, `PrismaEnrollmentRepository`, and `PrismaAuditLog` persist the primary payment, access, and audit paths.
- Discount-code create, update, archive, list, and apply flows are available through the admin pages and checkout action.
- Student refund requests and admin refund processing are available under `/admin/refunds`.

Pricing tier rows and course rows are separate records. The repository contains seed scripts, but this audit did not verify the contents of a deployed database or a full live PayMongo transaction.

### Practice tools

| URL                       | Status               | Notes                                                                                             |
| ------------------------- | -------------------- | ------------------------------------------------------------------------------------------------- |
| `/tools/bid-elevator`     | Implemented, partial | Registered simulator and graded attempt action exist; action currently records owner as `system`. |
| `/tools/str-triage`       | Implemented, partial | Registered simulator and graded attempt action exist; action currently records owner as `system`. |
| `/tools/campaign-builder` | Implemented, partial | Registered simulator and graded attempt action exist; action currently records owner as `system`. |
| `/tools/listing-audit`    | Implemented, partial | Registered simulator and graded attempt action exist; action currently records owner as `system`. |
| `/tools/keyword-research` | Partial              | UI route exists and reuses Listing Audit behavior; it is not a fifth registry implementation.     |

The four registered simulators share the attempt, scoring, and feedback infrastructure. Their scores are formative only. The simulator accuracy audit documents free dimensions, policy gaps, and a Listing Audit click-through strategy; scores must not be used as certification, hiring, or job-readiness evidence yet.

### Learning progress and credentials

- Dashboard route: `/dashboard`.
- Profile and badge display: `/profile`.
- XP, progress events, streaks, quiz attempts, and badge awards have domain entities, repositories, use cases, and tests.
- Certificate verification: `/certificates/[hash]`.
- Certificate PDF route: `/certificates/[hash]/pdf`.
- Admin certificate revocation action is available and records the revocation state.

The certificate and simulator flows should be tested against seeded data before being used as operational proof of completion.

### Admin operations

The admin route tree is implemented and gated by `requireAdmin()`:

- `/admin` dashboard
- `/admin/users` and `/admin/users/[id]`
- `/admin/courses` and nested module and lesson editors
- `/admin/payments` and `/admin/payments/[id]`
- `/admin/refunds` and `/admin/refunds/[orderId]`
- `/admin/simulators` and scenario editors
- `/admin/live-classes`
- `/admin/discount-codes`
- `/admin/badges`
- `/admin/audit-log` and CSV export
- `/admin/settings` and TOTP setup

Audit writes are wired through `RecordAuditLog` and persisted by `PrismaAuditLog` for the implemented mutation paths. The Prisma badge adapter still throws for create, update, and archive, so those three admin badge mutations are not production-complete. The dashboard's pending-refund statistic is currently a hardcoded zero.

### Email, observability, and scheduled work

- Resend adapter and React Email templates exist for verification, password reset, receipt, refund, certificate, and live-class reminder messages.
- Pino structured logging, action tracing, Sentry client/server/edge configuration, and Web Vitals reporting are present.
- `/api/cron/live-class-reminders` is protected by `CRON_SECRET` and uses `SentReminder` persistence for idempotency.
- `vercel.json` schedules the reminder endpoint once daily at `0 8 * * *`.
- `/api/health` is a lightweight liveness response. It does not query the database.

## Partial or not shipped

| Area                         | Current state | Evidence or next step                                                                                                                                                         |
| ---------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student account settings     | Partial       | Profile display exists; password, notification, data-export, and account-deletion product flows described in older docs are not all present as routes or actions.             |
| All-access entitlement rules | Partial       | Pricing-tier and early-bird models exist; verify checkout and enrollment semantics before describing all-access as a complete product path.                                   |
| Live-class experience        | Partial       | Admin live-class CRUD and reminder email exist; RSVP, capacity, attendance, recordings, and student-facing class pages are not represented by a complete route/model surface. |
| Editable email templates     | Partial       | Entity, port, adapter, and use cases exist; the documented admin email-template pages and actions are not present in `src/app`.                                               |
| Simulator ownership          | Partial       | Replace `userId: "system"` with the authenticated user in all four graded actions and add ownership tests.                                                                    |
| Badge administration         | Partial       | Implement Prisma create, update, and archive before treating the admin badge editor as shipped.                                                                               |
| Session revocation           | Partial       | Add session membership or token-version checks and enforce account lockout behavior.                                                                                          |
| Impersonation restore        | Partial       | Capture the original admin token on the first impersonation; the current fallback signs out.                                                                                  |
| Admin refund metric          | Partial       | Replace `pendingRefunds: 0` with a repository query or label the value unavailable.                                                                                           |
| Quiz lesson transition       | Partial       | Link quiz lesson content to the dedicated quiz page instead of rendering the placeholder.                                                                                     |
| Admin settings               | Partial       | TOTP is implemented; general site settings and maintenance controls remain “Coming soon”.                                                                                     |
| Admin seed smoke test        | Partial       | `scripts/seed-admin-user.mjs` exists, but it constructs Prisma directly instead of using the Prisma 7 driver adapter.                                                         |

## Deliberately out of scope

- AI features or external LLM APIs.
- Multi-tenant organizations.
- Subscription billing.
- Multi-currency checkout.
- Native mobile applications.
- Community forum or in-app social feed.
- Automated job-readiness or hiring decisions based on simulator scores.

## Verification snapshot

On 2026-07-27:

- `pnpm typecheck`: pass.
- `pnpm lint`: pass.
- `pnpm build`: pass.
- `pnpm test:arch`: 512 passing.
- Full Vitest run with `NODE_ENV=test`: 2,962 passing, 2 skipped, and 2 Windows-only migration-contract failures caused by POSIX executable paths in the test file.
- `pnpm prisma validate`: pass.
- Playwright E2E: not verified locally because the required browser binaries were not installed.
