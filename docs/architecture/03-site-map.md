# Current site map

**Reviewed:** 2026-07-27  
**Ground truth:** the App Router files under `src/app/` and the successful `pnpm build` route manifest.

## Public and account routes

- `/` landing page
- `/pricing`
- `/courses`
- `/courses/[slug]`
- `/signup`
- `/login`
- `/admin-login`
- `/verify-email`
- `/verify-email/sent`
- `/reset-password`
- `/reset-password/[token]`
- `/certificates/[hash]`
- `/certificates/[hash]/pdf`
- `/checkout`
- `/checkout/success`
- `/checkout/failed`

Catalog and pricing pages depend on published course rows and active pricing-tier rows. Empty database state is rendered as an empty-state message, not a build failure.

## Student routes

- `/dashboard`
- `/profile`
- `/courses/[slug]/lessons/[lessonId]`
- `/courses/[slug]/lessons/[lessonId]/quiz`
- `/tools`
- `/tools/bid-elevator`
- `/tools/str-triage`
- `/tools/campaign-builder`
- `/tools/listing-audit`
- `/tools/keyword-research`

All five simulator URLs resolve to registered domain engines, including Keyword Research (STORY-081), which now has its own domain simulator and versioned `KeywordDataset` repository rather than reusing Listing Audit.

## Admin routes

All `/admin/*` pages inherit the `requireAdmin()` gate in `src/app/admin/layout.tsx`.

- `/admin`
- `/admin/users`
- `/admin/users/[id]`
- `/admin/courses`
- `/admin/courses/new`
- `/admin/courses/[id]`
- `/admin/courses/[id]/edit`
- `/admin/courses/[id]/modules/new`
- `/admin/courses/[id]/modules/[moduleId]`
- `/admin/courses/[id]/modules/[moduleId]/edit`
- `/admin/courses/[id]/modules/[moduleId]/lessons/new`
- `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]`
- `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]/edit`
- `/admin/payments`
- `/admin/payments/[id]`
- `/admin/refunds`
- `/admin/refunds/[orderId]`
- `/admin/simulators`
- `/admin/simulators/new`
- `/admin/simulators/[id]/edit`
- `/admin/live-classes`
- `/admin/live-classes/new`
- `/admin/live-classes/[id]/edit`
- `/admin/discount-codes`
- `/admin/discount-codes/new`
- `/admin/discount-codes/[id]/edit`
- `/admin/badges`
- `/admin/badges/new`
- `/admin/badges/[slug]/edit`
- `/admin/audit-log`
- `/admin/settings`
- `/admin/settings/2fa-setup`

There is no current admin email-template page under `src/app/admin`, despite the entity, repository, and use cases for email templates.

## Route handlers and server endpoints

- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/admin-login`
- `/api/health`
- `/api/cron/live-class-reminders`
- `/api/quizzes/[quizId]/attempt`
- `/api/webhooks/paymongo`
- `/actions/verifyEmail`
- `/admin/audit-log/export`
- `/certificates/[hash]/pdf`

The health endpoint runs `courseRepo.listAll()` as a DB readiness probe to verify Postgres connectivity. The live-class cron requires `CRON_SECRET`; `vercel.json` schedules it daily at `0 8 * * *`.

## Server actions

Mutation and orchestration shims live in `src/app/actions/`. Current action files cover authentication, checkout and enrollment, verification and password reset, certificate revocation, module and lesson CRUD/reordering, course CRUD, discount codes, badges, live classes, simulator scenarios and attempts, refunds, audit-log viewing/export, and two-factor setup.

The complete file inventory is intentionally kept in the source tree. `docs/api-reference.md` records the current groups and the known deviations from the original target design.
