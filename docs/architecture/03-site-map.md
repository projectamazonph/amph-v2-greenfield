# Current site map

**Reviewed:** 2026-08-14 against `6c61fc3`
**Ground truth:** the App Router files under `src/app/` and the successful `pnpm build` route manifest.

## Public and account routes

- `/` landing page
- `/pricing`
- `/courses`
- `/courses/[slug]`
- `/courses/[slug]/quizzes/[quizId]` (canonical quiz-attempt route; legacy `/courses/[slug]/lessons/[lessonId]/quiz` redirects here)
- `/signup`
- `/login`
- `/admin-login`
- `/verify-email`
- `/verify-email/sent`
- `/reset-password`
- `/reset-password/[token]`
- `/faq`
- `/certificates/[hash]`
- `/certificates/[hash]/pdf`
- `/checkout`
- `/checkout/success`
- `/checkout/failed`

Catalog and pricing pages depend on published course rows and active pricing-tier rows. Empty database state is rendered as an empty-state message, not a build failure.

## Student routes

- `/dashboard`
- `/profile`
- `/profile/data`
- `/profile/purchases`
- `/profile/security`
- `/profile/security/2fa-setup`
- `/certificates` (student-facing issued-certificate list)
- `/resources` (download center; gated by enrollment/subscription tier)
- `/live-classes` (student list)
- `/live-classes/[id]` (student detail and join link)
- `/courses/[slug]/lessons/[lessonId]`
- `/courses/[slug]/lessons/[lessonId]/quiz` (legacy 10-line redirect to `/courses/[slug]/quizzes/[quizId]`)
- `/tools` (practice-simulator index)
- `/tools/bid-elevator`
- `/tools/str-triage`
- `/tools/campaign-builder`
- `/tools/listing-audit`
- `/tools/keyword-research`
- `/tools/ad-console` (iframe embed of the external Amazon Ad Console; not a simulator, runs against the student's real Amazon Advertising account — see `src/proxy.ts` for the `frame-src` allowance)

All five practice-simulator URLs resolve to registered domain engines, including Keyword Research (STORY-081), which has its own domain simulator and versioned `KeywordDataset` repository rather than reusing Listing Audit. `/tools/ad-console` is an isolated cross-origin embed; AMPH does not proxy, store, or see anything entered inside it.

## Admin routes

All `/admin/*` pages inherit the `requireAdmin()` gate in `src/app/admin/layout.tsx`. Pages that call `requireAdmin()` again inside the page body do so to make the gate's intent explicit at the point of use, not to duplicate authority.

- `/admin`
- `/admin/users`
- `/admin/users/new`
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
- `/admin/quizzes`
- `/admin/quizzes/new`
- `/admin/quizzes/[quizId]/edit`
- `/admin/certificates`
- `/admin/certificates/[id]`
- `/admin/content` (counts dashboard: courses, modules, lessons, quizzes, downloads)
- `/admin/payments`
- `/admin/payments/[id]`
- `/admin/refunds`
- `/admin/refunds/[orderId]`
- `/admin/simulators`
- `/admin/simulators/new`
- `/admin/simulators/[id]/edit`
- `/admin/simulators/[id]/versions` (scenario version history; publishes a draft or forks a new draft from any prior version)
- `/admin/live-classes`
- `/admin/live-classes/new`
- `/admin/live-classes/[id]/edit`
- `/admin/discount-codes`
- `/admin/discount-codes/new`
- `/admin/discount-codes/[id]/edit`
- `/admin/badges`
- `/admin/badges/new`
- `/admin/badges/[slug]/edit`
- `/admin/resources`
- `/admin/resources/new`
- `/admin/resources/[id]/edit`
- `/admin/email-templates`
- `/admin/email-templates/[type]/edit`
- `/admin/audit-log`
- `/admin/settings`
- `/admin/settings/2fa-setup`

Email-template management is available at `/admin/email-templates` and `/admin/email-templates/[type]/edit`, linked from the admin navigation and saved through the update action.

## Route handlers and server endpoints

- `/api/auth/signup`
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/admin-login`
- `/api/health`
- `/api/health/ready`
- `/api/cron/live-class-reminders`
- `/api/quizzes/[quizId]/attempt`
- `/api/resources/[id]/download` (signed-URL-style stream for download-center files)
- `/api/webhooks/paymongo`
- `/api/webhooks/resend/webhook` (inbound delivery/bounce/spam events from Resend)
- `/actions/verifyEmail`
- `/admin/audit-log/export`
- `/certificates/[hash]/pdf`

`/api/health` is a static liveness response. `/api/health/ready` probes Postgres through the database health-check port. The live-class cron requires `CRON_SECRET`; `vercel.json` schedules it daily at `0 8 * * *`. Auth-related API routes (`/api/auth/*`) are kept as route handlers rather than server actions so the signup, login, logout, and admin-login endpoints remain callable from external tools and from the documented `fetch` examples in `docs/api-reference.md`.

## Server actions

Mutation and orchestration shims live in `src/app/actions/`. Current action files cover authentication, checkout and enrollment, verification and password reset, certificate revocation, module and lesson CRUD/reordering, course CRUD, discount codes, badges, live classes, simulator scenarios and attempts, refunds, audit-log viewing/export, and two-factor setup.

The complete file inventory is intentionally kept in the source tree. `docs/api-reference.md` records the current groups and the known deviations from the original target design.
