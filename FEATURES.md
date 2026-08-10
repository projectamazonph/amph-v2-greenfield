# Feature inventory

**Last reviewed:** 2026-08-10
**Ground truth:** `src/`, `prisma/schema.prisma`, `scripts/`, and the current test suite.  
**Related audit:** `docs/audit-2026-07-27-completeness-review.md` (see `CLAUDE.md`'s "Known gaps" 2026-08-02 addendum for what's changed since)

This file is a status inventory, not a list of promises. A route can be implemented while still requiring database seed data or an operator configuration step.

Status labels:

- **Implemented:** source and route exist, with automated coverage where applicable.
- **Partial:** a meaningful slice exists, but an integration, adapter, seed, or UX path is incomplete.
- **Planned:** design or story material exists, but the current application does not ship it.

## Implemented surfaces

### Authentication and access

| Capability                      | Current implementation                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Student signup                  | `/signup`, `signup.action.ts`, `SignUp`, Argon2id hashing                                              |
| Student login and logout        | `/login`, `/api/auth/login`, `/api/auth/logout`, generic credential errors, lockout, `Login`, `Logout` |
| Admin login                     | `/admin-login`, `/api/auth/admin-login`                                                                |
| Email verification              | `/verify-email`, `/verify-email/sent`, verification action and route                                   |
| Password reset                  | `/reset-password`, `/reset-password/[token]`, Resend email flow                                        |
| Role gate                       | `requireAdmin()` in `src/lib/auth.ts` and `src/app/admin/layout.tsx`                                   |
| Admin two-factor authentication | Opt-in TOTP setup under `/admin/settings` and `/admin/settings/2fa-setup`                              |
| Rate limiting                   | Upstash adapter with in-memory test implementation; signup, login, and checkout actions are wired      |

The session guard validates the JWT, then checks the `sessions` table server-side when the token carries a `sessionId`. A deleted session is rejected even if the JWT itself has not expired. Login enforces `lockedUntil` and public responses no longer distinguish an unknown email from a wrong password.

### Courses and curriculum

- `/courses` lists published catalog rows from Postgres.
- `/courses/[slug]` renders course detail and module metadata.
- `/courses/[slug]/lessons/[lessonId]` renders MDX lesson content and navigation.
- `/courses/[slug]/quizzes/[quizId]` is the canonical access-controlled quiz route. The legacy lesson quiz URL redirects to it, and both the page and mutation enforce course access.
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
- Student purchase history and refund requests are available at `/profile/purchases`. The request policy enforces order ownership, paid status, a seven-day window, and less than 25% completion. Admin processing remains under `/admin/refunds` and uses the real PayMongo Refunds API.

Pricing tier rows link to course rows through `PricingTierCourse`. Signup preserves the selected tier, checkout resolves the linked course server-side, and both the displayed and charged totals use the same effective early-bird price. A deployed database and live PayMongo transaction still require environment-specific verification.

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
- Student certificate list: `/certificates`.
- Certificate verification: `/certificates/[hash]`.
- Certificate PDF route: `/certificates/[hash]/pdf`.
- Admin certificate revocation action is available and records the revocation state.

Lesson completion is persisted idempotently and updates course progress. Quiz and simulator attempts are access-controlled and exported with the student's other account data. Credential claims still require seeded production data and operational review.

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

| Area                         | Current state        | Evidence or next step                                                                                                                                                                                                                      |
| ---------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Student account settings     | Implemented          | Profile display, password change, 2FA, complete JSON data export, account deletion, purchases, refunds, and certificates exist. Unpersisted notification checkboxes were removed instead of presenting fake settings.                      |
| All-access entitlement rules | Implemented          | Active enrollment, admin access, and eligible subscription tiers grant course access. Tier checkout resolves the linked course and effective price server-side. Live production payment verification remains operational work.             |
| Live-class experience        | Implemented          | Student list, detail, enrollment-gated RSVP, cancellation, recording access, idempotent watched state, and XP award are implemented. Capacity limits are not part of the current model.                                                    |
| Editable email templates     | Implemented, partial | `/admin/email-templates` (list) and `/admin/email-templates/[type]/edit` exist (STORY-095, 2026-08-02), backed by real use cases. Not yet wired into the actual send path — editing a template here does not change what Resend sends yet. |
| Simulator ownership          | Implemented          | All 5 graded actions pass the authenticated `userId` from `getSessionUserId()`, not `"system"` (fixed 2026-07-31).                                                                                                                         |
| Badge administration         | Implemented          | Prisma create, update, and archive are wired; admin badge CRUD is shipped with slug-uniqueness and error handling.                                                                                                                         |
| Session revocation           | Implemented          | `getSessionUserId()` checks `SessionRepository` server-side after JWT verification when a `sessionId` is present. Login also enforces `lockedUntil`.                                                                                       |
| Impersonation restore        | Implemented          | `impersonateUser.action.ts` captures the admin's original session token and `stopImpersonating.action.ts` replants it on restore (fixed 2026-07-31).                                                                                       |
| Admin refund metric          | Implemented          | `GetAdminDashboardStats.pendingRefunds` queries `orderRepo.listRefundRequests()` (fixed 2026-07-31).                                                                                                                                       |
| Quiz lesson transition       | Implemented          | `LessonContent.tsx` routes quiz lessons to the dedicated quiz page (STORY-094, 2026-08-01).                                                                                                                                                |
| PayMongo refunds             | Implemented          | `PayMongoAdapter.refund()` calls the real PayMongo Refunds API (fixed 2026-08-02, STORY-049.5); `ProcessRefund`/`RefundOverride` work against production PayMongo.                                                                         |
| Admin settings               | Partial              | TOTP is implemented; general site settings and maintenance controls remain “Coming soon”.                                                                                                                                                  |
| Admin seed smoke test        | Implemented          | `scripts/seed-admin-user.mjs` uses the shared PrismaPg adapter path (fixed prior to 2026-07-27).                                                                                                                                           |

## Deliberately out of scope

- AI features or external LLM APIs.
- Multi-tenant organizations.
- Subscription billing.
- Multi-currency checkout.
- Native mobile applications.
- Community forum or in-app social feed.
- Automated job-readiness or hiring decisions based on simulator scores.

## Verification snapshot

On 2026-08-10:

- TypeScript: pass.
- ESLint: pass.
- Next.js production build: pass, 94 application routes compiled.
- Full Vitest run without file parallelism: 3,789 passing, 2 skipped.
- Coverage: 82.17% statements, 76.69% branches, 82.83% functions, 83.21% lines.
- Prisma schema and migration contract tests: pass as part of the full suite.
- Playwright E2E: blocked locally because the required Chromium binary is not installed and the restricted workspace network returns an empty archive for the standard download.
