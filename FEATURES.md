# Feature inventory

**Last reviewed:** 2026-08-02  
**Ground truth:** `src/`, `prisma/schema.prisma`, `scripts/`, and the current test suite.  
**Related audit:** `docs/audit-2026-07-27-completeness-review.md` (see `CLAUDE.md`'s "Known gaps" 2026-08-02 addendum for what's changed since)

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

The session guard validates the JWT, then (fixed 2026-07-31) checks the `sessions` table server-side when the token carries a `sessionId` — a deleted session is rejected even if the JWT itself hasn't expired. `lockedUntil` still has no enforcement path; see `docs/runbooks/admin-access-recovery.md`.

### Courses and curriculum

- `/courses` lists published catalog rows from Postgres.
- `/courses/[slug]` renders course detail and module metadata.
- `/courses/[slug]/lessons/[lessonId]` renders MDX lesson content and navigation.
- `/courses/[slug]/lessons/[lessonId]/quiz` and `/api/quizzes/[quizId]/attempt` provide the dedicated quiz attempt flow.
- `scripts/import-amph-content.ts` imports the MDX curriculum under `content/curriculum/` into module and lesson rows.
- Admin course, module, and lesson CRUD is available under `/admin/courses`.

The public catalog and pricing pages deliberately render an empty-state message when no published course or active pricing rows have been seeded. `LessonContent.tsx` routes quiz lessons to the dedicated quiz page (STORY-094, 2026-08-01) — the placeholder is gone.

### Pricing, checkout, and refunds

- `/pricing` reads active `PricingTier` rows and displays early-bird values when configured.
- `/checkout`, `/checkout/success`, and `/checkout/failed` provide the student checkout flow.
- `PayMongoAdapter` creates hosted checkout sessions and verifies webhook signatures.
- `/api/webhooks/paymongo` records webhook events and processes payment state through the production container.
- `PrismaOrderRepository`, `PrismaEnrollmentRepository`, and `PrismaAuditLog` persist the primary payment, access, and audit paths.
- Discount-code create, update, archive, list, and apply flows are available through the admin pages and checkout action.
- Student refund requests and admin refund processing are available under `/admin/refunds`, backed by the real PayMongo Refunds API as of 2026-08-02 (previously a stub that always errored).

Pricing tier rows and course rows are separate records. The repository contains seed scripts, but this audit did not verify the contents of a deployed database or a full live PayMongo transaction.

### Practice tools

| URL                       | Status               | Notes                                                                                                                                                                                                                                                             |
| ------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/tools/bid-elevator`     | Implemented          | Registered simulator and graded attempt action exist; the score is formative-labeled (STORY-078) and owned by the authenticated user.                                                                                                                             |
| `/tools/str-triage`       | Implemented          | Registered simulator and graded attempt action exist; the score is formative-labeled (STORY-078) and owned by the authenticated user.                                                                                                                             |
| `/tools/campaign-builder` | Implemented          | Registered simulator and graded attempt action exist; the score is formative-labeled (STORY-078) and owned by the authenticated user.                                                                                                                             |
| `/tools/listing-audit`    | Implemented          | Registered simulator and graded attempt action exist; the score is formative-labeled (STORY-078) and owned by the authenticated user.                                                                                                                             |
| `/tools/keyword-research` | Implemented, partial | Registered simulator (STORY-081) with its own versioned `KeywordDataset` and graded lifecycle; only 4 of 12 launch niches are curated so far, and every dataset is `synthetic_calibrated` (no curated-export data yet, so credential-mode attempts are rejected). |

The five registered simulators share the attempt, scoring, and feedback infrastructure. Their scores are formative only. The simulator accuracy audit documents free dimensions, policy gaps, and a Listing Audit click-through strategy; scores must not be used as certification, hiring, or job-readiness evidence yet.

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

Audit writes are wired through `RecordAuditLog` and persisted by `PrismaAuditLog` for the implemented mutation paths. The Prisma badge adapter now implements create, update, and archive with slug-uniqueness and not-found error handling, so admin badge CRUD is production-complete. The dashboard's pending-refund statistic queries `orderRepo.listRefundRequests()` (fixed 2026-07-31; no longer a hardcoded zero). `/admin/email-templates` (STORY-095, 2026-08-02) lists and edits all 7 known template types.

### Email, observability, and scheduled work

- Resend adapter and React Email templates exist for verification, password reset, receipt, refund, certificate, and live-class reminder messages.
- Pino structured logging, action tracing, Sentry client/server/edge configuration, and Web Vitals reporting are present.
- `/api/cron/live-class-reminders` is protected by `CRON_SECRET` and uses `SentReminder` persistence for idempotency.
- `vercel.json` schedules the reminder endpoint once daily at `0 8 * * *`.
- `/api/health` is a readiness probe that runs `SELECT 1` against Postgres via a lightweight Prisma client and returns 503 if the database is unreachable.

## Partial or not shipped

| Area                         | Current state        | Evidence or next step                                                                                                                                                                                                                                 |
| ---------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Student account settings     | Implemented, partial | Profile display, password change, 2FA (`/profile/security`, 2026-08-02), and data export + account deletion (`/profile/data`, 2026-08-02) all exist. Notification preferences are still checkbox placeholders on `/profile` with no backing use case. |
| All-access entitlement rules | Partial              | Pricing-tier and early-bird models exist; verify checkout and enrollment semantics before describing all-access as a complete product path.                                                                                                           |
| Live-class experience        | Implemented, partial | Admin CRUD, reminder email, and student-facing `/live-classes` list + `/live-classes/[id]` RSVP (STORY-090/091) exist. Capacity limits, attendance tracking, and recordings are not represented by a complete route/model surface.                    |
| Editable email templates     | Implemented, partial | `/admin/email-templates` (list) and `/admin/email-templates/[type]/edit` exist (STORY-095, 2026-08-02), backed by real use cases. Not yet wired into the actual send path — editing a template here does not change what Resend sends yet.            |
| Simulator ownership          | Implemented          | All 5 graded actions pass the authenticated `userId` from `getSessionUserId()`, not `"system"` (fixed 2026-07-31).                                                                                                                                    |
| Badge administration         | Implemented          | Prisma create, update, and archive are wired; admin badge CRUD is shipped with slug-uniqueness and error handling.                                                                                                                                    |
| Session revocation           | Implemented          | `getSessionUserId()` checks `SessionRepository` server-side after JWT verification when a `sessionId` is present in the token (fixed 2026-07-31). Account lockout (`lockedUntil`) still has no enforcement path.                                      |
| Impersonation restore        | Implemented          | `impersonateUser.action.ts` captures the admin's original session token and `stopImpersonating.action.ts` replants it on restore (fixed 2026-07-31).                                                                                                  |
| Admin refund metric          | Implemented          | `GetAdminDashboardStats.pendingRefunds` queries `orderRepo.listRefundRequests()` (fixed 2026-07-31).                                                                                                                                                  |
| Quiz lesson transition       | Implemented          | `LessonContent.tsx` routes quiz lessons to the dedicated quiz page (STORY-094, 2026-08-01).                                                                                                                                                           |
| PayMongo refunds             | Implemented          | `PayMongoAdapter.refund()` calls the real PayMongo Refunds API (fixed 2026-08-02, STORY-049.5); `ProcessRefund`/`RefundOverride` work against production PayMongo.                                                                                    |
| Admin settings               | Partial              | TOTP is implemented; general site settings and maintenance controls remain “Coming soon”.                                                                                                                                                             |
| Admin seed smoke test        | Implemented          | `scripts/seed-admin-user.mjs` uses the shared PrismaPg adapter path (fixed prior to 2026-07-27).                                                                                                                                                      |

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
