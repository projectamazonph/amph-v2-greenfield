# API and runtime inventory

**Reviewed:** 2026-08-14 against `6c61fc3`
**Application:** Project Amazon PH Academy v2  
**Source of truth:** `src/app/`, `src/app/actions/`, `src/usecases/`, `src/ports/`, `src/composition/container.ts`, and `prisma/schema.prisma`.

This document replaces the original Day 0 API design as the current-state reference. The original design described planned ports, routes, and models that were never added. Do not infer a route or method from a design section that is absent from the source tree.

## Runtime stack

| Concern        | Current implementation                                                         |
| -------------- | ------------------------------------------------------------------------------ |
| Framework      | Next.js 16 App Router, React server components by default                      |
| Language       | TypeScript strict                                                              |
| Database       | PostgreSQL through Prisma 7 and `@prisma/adapter-pg`                           |
| Composition    | `src/composition/container.ts`, cached production container plus request scope |
| Authentication | `jose` JWT in HttpOnly cookies, Argon2id password hashing                      |
| Payment        | `IPaymentGateway` and `PayMongoAdapter`                                        |
| Email          | `EmailSender` and `ResendEmailSender`, React Email templates                   |
| PDF            | `CertificateRenderer` and React PDF adapter                                    |
| Rate limiting  | `RateLimiter`, Upstash production adapter, in-memory test adapter              |
| Observability  | Pino logger, Sentry client/server/edge configuration, Web Vitals               |
| Styling        | CSS Modules and AMPH design tokens, no Tailwind utility classes                |
| Testing        | Vitest, architecture tests, integration tests, Playwright E2E                  |

## Dependency direction

```text
src/app             -> src/usecases -> src/ports <- src/infra
                                      -> src/domain
src/composition wires concrete infra adapters to the ports
src/domain and src/ports do not import app, infra, or framework code
```

The ESLint boundary tests enforce the direction. `src/composition/container.ts` is the production wiring file. `src/composition/container.test.ts` supplies in-memory and fake adapters for tests.

## Route inventory

### Public and account pages

| Path                               | File                                               |
| ---------------------------------- | -------------------------------------------------- |
| `/`                                | `src/app/page.tsx`                                 |
| `/pricing`                         | `src/app/pricing/page.tsx`                         |
| `/courses`                         | `src/app/courses/page.tsx`                         |
| `/courses/[slug]`                  | `src/app/courses/[slug]/page.tsx`                  |
| `/signup`                          | `src/app/signup/page.tsx`                          |
| `/login`                           | `src/app/login/page.tsx`                           |
| `/admin-login`                     | `src/app/admin-login/page.tsx`                     |
| `/verify-email`                    | `src/app/verify-email/page.tsx`                    |
| `/verify-email/sent`               | `src/app/verify-email/sent/page.tsx`               |
| `/reset-password`                  | `src/app/reset-password/page.tsx`                  |
| `/reset-password/[token]`          | `src/app/reset-password/[token]/page.tsx`          |
| `/checkout`                        | `src/app/checkout/page.tsx`                        |
| `/checkout/success`                | `src/app/checkout/success/page.tsx`                |
| `/checkout/failed`                 | `src/app/checkout/failed/page.tsx`                 |
| `/certificates/[hash]`             | `src/app/certificates/[hash]/page.tsx`             |
| `/faq`                             | `src/app/faq/page.tsx`                             |
| `/courses/[slug]/quizzes/[quizId]` | `src/app/courses/[slug]/quizzes/[quizId]/page.tsx` |

### Student pages

- `/dashboard`
- `/profile`, `/profile/data`, `/profile/purchases`, `/profile/security`, `/profile/security/2fa-setup`
- `/certificates` — student-facing list of issued certificates
- `/resources` — download center (STORY-098): guides, templates, automation tools, handouts, cheat sheets, grouped by category and gated by `CourseAccessTier`
- `/live-classes`, `/live-classes/[id]` — student-facing schedule and join link
- `/courses/[slug]/lessons/[lessonId]`
- `/courses/[slug]/lessons/[lessonId]/quiz` — legacy redirect to `/courses/[slug]/quizzes/[quizId]`
- `/courses/[slug]/quizzes/[quizId]` — canonical quiz-attempt page
- `/tools` — practice-simulator index
- `/tools/bid-elevator`
- `/tools/str-triage`
- `/tools/campaign-builder`
- `/tools/listing-audit`
- `/tools/keyword-research`
- `/tools/ad-console` — iframe embed of the external Amazon Ad Console (not a simulator; AMPH does not proxy or store anything entered inside it)

### Admin pages

All pages under `/admin` inherit `requireAdmin()` from `src/app/admin/layout.tsx`.

- `/admin`
- `/admin/users`, `/admin/users/new`, `/admin/users/[id]`
- `/admin/courses`, `/admin/courses/new`, `/admin/courses/[id]`, `/admin/courses/[id]/edit`
- `/admin/courses/[id]/modules/new`
- `/admin/courses/[id]/modules/[moduleId]`, `/edit`
- `/admin/courses/[id]/modules/[moduleId]/lessons/new`
- `/admin/courses/[id]/modules/[moduleId]/lessons/[lessonId]`, `/edit`
- `/admin/quizzes`, `/admin/quizzes/new`, `/admin/quizzes/[quizId]/edit` — quiz CRUD
- `/admin/certificates`, `/admin/certificates/[id]` — admin list with active/revoked tabs and per-row revoke flow
- `/admin/content` — counts dashboard (courses, modules, lessons, quizzes, downloads)
- `/admin/payments`, `/admin/payments/[id]`
- `/admin/refunds`, `/admin/refunds/[orderId]`
- `/admin/simulators`, `/admin/simulators/new`, `/admin/simulators/[id]/edit`, `/admin/simulators/[id]/versions` — version history
- `/admin/live-classes`, `/admin/live-classes/new`, `/admin/live-classes/[id]/edit`
- `/admin/resources`, `/admin/resources/new`, `/admin/resources/[id]/edit` — download-center CRUD (STORY-098)
- `/admin/discount-codes`, `/new`, `/[id]/edit`
- `/admin/badges`, `/new`, `/[slug]/edit`
- `/admin/audit-log`
- `/admin/settings`, `/admin/settings/2fa-setup`

Email-template UI routes are `/admin/email-templates` and `/admin/email-templates/[type]/edit`. They are linked from the admin navigation and save through `UpdateEmailTemplate`.

### Route handlers

| Method and path                            | Purpose                                                                                                                                |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/auth/signup`                    | Signup and redirect response with session cookie                                                                                       |
| `POST /api/auth/login`                     | Login and redirect response with session cookie                                                                                        |
| `POST /api/auth/admin-login`               | Login with an admin-role check                                                                                                         |
| `POST /api/auth/logout`                    | Clear the session cookie                                                                                                               |
| `GET /api/health`                          | Liveness response and version; no database probe                                                                                       |
| `GET /api/health/ready`                    | Readiness probe: connects to Postgres through the database health-check port                                                           |
| `GET, POST /api/cron/live-class-reminders` | Cron health check and protected reminder execution                                                                                     |
| `POST /api/quizzes/[quizId]/attempt`       | Quiz attempt submission                                                                                                                |
| `GET /api/resources/[id]/download`         | Re-checks access, records the download, 302-redirects to the resource's `fileUrl` (relative paths resolved against the request origin) |
| `POST /api/webhooks/paymongo`              | Signature-verified PayMongo webhook processing                                                                                         |
| `POST /api/webhooks/resend/webhook`        | Signature-verified inbound Resend events; raw payloads are recorded for replay and forensics                                           |
| `POST /actions/verifyEmail`                | Email verification action route                                                                                                        |
| `GET /admin/audit-log/export`              | CSV audit-log export                                                                                                                   |
| `GET /certificates/[hash]/pdf`             | Certificate PDF response                                                                                                               |

There is no public REST API version. Mutations use server actions except for webhooks, third-party callbacks, health, cron, quiz submission, and PDF or CSV responses.

## Server action groups

Files under `src/app/actions/` currently cover:

- Authentication: signup, login, logout, password reset, verification, resend verification, two-factor setup.
- Checkout and access: checkout, enrollment, course access.
- Curriculum administration: course, module, lesson create/update/delete/reorder/archive actions.
- Payment operations: refund request, refund processing, certificate revocation.
- Admin resources: users and impersonation, discount codes, badges, simulator scenarios, live classes, download-center resources.
- Simulator lifecycle: start attempt, save decision, submit, grade, compose feedback, and four tool-specific wrappers.
- Audit and operations: list/export audit logs, live-class reminder invocation.

Each action should parse untrusted input, obtain the request container, call a use case, and return a discriminated result. The exact input and error unions are defined beside each action and use case; this document intentionally does not duplicate those types.

## Use-case groups

`src/usecases/` contains flat application classes plus `src/usecases/auth/` for the password and email token flows.

| Group                       | Representative classes                                                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication              | `SignUp`, `Login`, `Logout`, `VerifyEmail`, `ResendVerification`, `RequestPasswordReset`, `ResetPassword`                                                                                                                                                                            |
| Checkout and access         | `CreatePaymentIntent`, `ApplyDiscountCode`, `EnrollStudent`, `CheckCourseAccess`, `AuthorizeLessonAccess`, `ProcessRefund` _(moved to `refund/`: `RequestRefund`)_                                                                                                                   |
| Curriculum                  | `ListCatalogCourses`, `GetCatalogCourse`, `ListCourses`, `GetCourse`, `CreateCourse`, `UpdateCourse`, `ArchiveCourse`, `CreateModule`, `UpdateModule`, `DeleteModule`, `ReorderModules`, `CreateLesson`, `UpdateLesson`, `DeleteLesson`, `ReorderLessons`, `RebuildCourseCurriculum` |
| Learning                    | `RecordQuizAttempt`, `AwardXP`, `AwardBadge`, `ListUserBadges` _(moved to `progress/`: `RecordStreakVisit`, `MarkLessonComplete`)_                                                                                                                                                   |
| Certificates                | `IssueCertificate`, `RenderCertificatePdf`, `VerifyCertificate`, `RevokeCertificate`                                                                                                                                                                                                 |
| Simulator infrastructure    | `StartSimulatorAttempt`, `SaveSimulatorDecision`, `SubmitSimulatorAttempt`, `GradeSimulatorAttempt`, `ComposeAttemptFeedback`                                                                                                                                                        |
| Simulator administration    | `AdminListScenarios`, `GetSimulatorScenario`, `CreateSimulatorScenario`, `UpdateSimulatorScenario`, `ArchiveSimulatorScenario`                                                                                                                                                       |
| Admin operations            | `ListUsers`, `GetUserDetail`, `ImpersonateUser`, `GetAdminDashboardStats`, payment and refund admin classes, audit-log classes, live-class classes, discount-code classes, badge classes                                                                                             |
| Email and reminders         | `SendLiveClassReminders` _(moved to `email/`: `ListEmailTemplates`, `GetEmailTemplate`, `UpdateEmailTemplate`)_                                                                                                                                                                      |
| Two-factor authentication   | `EnableTwoFactor`, `ConfirmTwoFactor`, `DisableTwoFactor`                                                                                                                                                                                                                            |
| Download center (STORY-098) | `CreateResource`, `UpdateResource`, `DeleteResource`, `AdminListResources`, `AdminGetResource`, `ListAvailableResources`, `RecordResourceDownload`, `PurgeResource`, `UploadFile`, `DeleteFile` (STORY-098.5)                                                                        |

## Ports and adapters

### Repository ports

`src/ports/repositories/` contains ports for users, sessions, courses, modules, lessons, orders, enrollments, discount codes, quizzes and attempts, XP and progress, badges and awards, certificates, audit logs, webhook events, simulator scenarios and attempts, score policies, feedback, live classes, pricing tiers, email verification, password reset, sent reminders, user streaks, email templates, and download-center resources (`IResourceRepository`, STORY-098).

### Service and gateway ports

- `IFileStorage` (STORY-098.5) — generic upload/delete; production adapter is `VercelBlobFileStorage`, dev fallback is `LocalFileStorage` (does not persist in production)
- `IPaymentGateway`
- `EmailSender`, `EmailVerificationRenderer`, `LiveClassReminderRenderer`
- `IAccessPolicy`
- `CertificateRenderer`, `IMdxContentRenderer`
- `JwtService`, `PasswordHasher`, `RateLimiter`, `TotpService`, `CertificateHashGenerator`
- `Simulator`, `SimulatorRegistry`
- `Clock`, `IdGenerator`, `ContentIdGenerator`, `Logger`

The production container uses Prisma, PayMongo, Resend, Argon2, jose, otpauth, Upstash, React PDF, and Next MDX adapters. The test container uses in-memory or fake implementations.

Prisma badge mutations, the shared Prisma 7 admin seed path, live-class registration persistence, and authenticated simulator ownership are implemented. Dated audit files retain the earlier findings for history.

## Authentication behavior

- JWTs are signed with HS256 using `JWT_SECRET`.
- Session cookies are HttpOnly, SameSite=Lax, and use `amph_session` for HTTP or `__Secure-amph_session` for HTTPS.
- Login and signup route handlers set cookies on the redirect response.
- `getSessionUserId()` verifies the cookie and `getSessionUser()` reloads the user row.
- `requireAuth()` redirects unauthenticated requests to `/login`.
- `requireAdmin()` redirects non-admin users to `/dashboard?error=forbidden`.

Request guards consult the `sessions` table when the JWT carries a `sessionId`, so deleting that session revokes access. Login enforces `lockedUntil`. Role changes are re-read from Postgres and take effect on the next guarded request.

## Payment and webhook behavior

`POST /api/webhooks/paymongo` obtains the production container, verifies the PayMongo signature, records a durable `WebhookEvent`, and processes the event through the configured order, enrollment, and audit ports. The old documentation claim that the route creates in-memory repositories is obsolete.

The current repository contains no separate public `Checkout`, `Payment`, `Refund`, or `Receipt` Prisma models from the original target design. Payment state is represented by `Order` and related fields. Confirm model names in `prisma/schema.prisma` before writing integrations.

## Scheduled reminders

`GET /api/cron/live-class-reminders` reports whether `CRON_SECRET` is configured. `POST` requires `x-cron-secret`, then invokes `SendLiveClassReminders`. `SentReminder` persistence makes sends idempotent. Vercel configuration currently runs the job once daily at `0 8 * * *`.

## Error and verification conventions

Domain and use-case failures use the `Result` type from `src/domain/shared/Result.ts`. Route handlers and server actions map those results to redirects, JSON, or page states. Programmer invariant violations can throw; external and business failures should remain discriminated results.

For the current verification commands and known Windows test limitations, see the completeness audit and `README.md`.
