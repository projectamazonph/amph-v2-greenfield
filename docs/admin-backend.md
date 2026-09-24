# Admin Backend — Project Amazon PH Academy v2

**Status:** Approved
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)
**Last updated:** 2026-09-24 against `2a7e8bdd`

---

## Purpose

The admin panel is what lets Ryan (and any future co-admins) operate the platform: see who signed up, who paid, who refunded, fix typos in lessons, manage announcements and resources, create discount codes, run the simulator scenario catalog, review capstone submissions, manage assignments, and read the audit log. It is not a separate product. It is `src/app/admin/*`, gated by `requireAdmin()`, served from the same Next.js app.

Every admin route has search, filter, pagination. Every mutation is audited. Every action runs through a use case — no direct Prisma from page files. ADR-013, ISP, DIP.

Manual paid-tier grants also create eligible published-course enrollments. They are idempotent, create no Order row, and send a password-reset link for a new account. Admin login sets its cookie on the redirect response before navigating to `/admin`.

## Roles

| Role         | Access                                                              |
| ------------ | ------------------------------------------------------------------- |
| `STUDENT`    | No `/admin/*` access                                                |
| `INSTRUCTOR` | No `/admin/*` access under the current `requireAdmin()` gate        |
| `ADMIN`      | Admin pages and audited mutations; cannot impersonate another admin |

Role is a column on `User`. Stored on the JWT. Re-checked on every admin request (no stale-allow).

## Layout

```
src/app/admin/
├── layout.tsx                       # requireAdmin() at the top
├── page.tsx                          # dashboard
├── users/
│   ├── page.tsx                      # list + search + filter
│   ├── new/page.tsx                  # grant-subscription form (manual tier grant)
│   └── [id]/
│       ├── page.tsx                  # user detail
│       └── impersonate.action.ts     # admin can impersonate non-admin users
├── courses/
│   ├── page.tsx
│   ├── new/page.tsx                  # create course
│   └── [id]/
│       ├── page.tsx
│       ├── edit/page.tsx
│       ├── prerequisites/page.tsx    # course gating rules
│       └── modules/[moduleId]/
│           ├── page.tsx
│           ├── edit/page.tsx
│           └── lessons/
│               ├── [lessonId]/
│               │   ├── page.tsx
│               │   └── edit/page.tsx
│               └── new/page.tsx
├── content/page.tsx                  # content management hub (STORY-160)
├── quizzes/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [quizId]/
│       └── edit/page.tsx
├── payments/
│   ├── page.tsx
│   ├── [id]/page.tsx                # order detail
│   └── export/route.ts              # GET ?status=... returns CSV
├── refunds/
│   ├── page.tsx
│   └── [orderId]/page.tsx          # refund detail
├── simulators/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/
│       ├── edit/page.tsx
│       ├── versions/page.tsx        # version history for a scenario family
│       └── [scenarioKey]/calibration/page.tsx  # grader dimension bands
├── live-classes/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/
│       └── edit/page.tsx
├── discount-codes/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/
│       └── edit/page.tsx
├── badges/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [slug]/
│       └── edit/page.tsx
├── certificates/
│   ├── page.tsx
│   └── [id]/page.tsx
├── resources/
│   ├── page.tsx                      # download center (STORY-098)
│   ├── new/page.tsx
│   └── [id]/
│       └── edit/page.tsx
├── assignments/
│   ├── page.tsx                      # student assignment list (P1-02)
│   ├── new/page.tsx                  # assign work to a student
│   └── [id]/page.tsx                 # assignment detail + grade form
├── announcements/
│   ├── page.tsx                      # banner management (P1-07)
│   ├── new/page.tsx
│   └── [id]/
│       └── edit/page.tsx
├── capstone/
│   ├── page.tsx                      # reviewer queue (LEARN-044)
│   └── [id]/page.tsx                 # single review with artefacts + rubric
├── audit-log/
│   ├── page.tsx
│   └── export/route.ts              # GET ?actorId=...&action=... returns CSV
├── maintenance/page.tsx               # maintenance mode kill switch (P1-08)
├── email-templates/
│   ├── page.tsx                      # list of all 7 template types
│   └── [type]/edit/page.tsx          # edit subject, headline, intro, CTA
└── settings/
    ├── page.tsx                       # environment vars, actor info, site key/value
    └── 2fa-setup/page.tsx            # TOTP enrollment flow (opt-in)
```

`requireAdmin()` is implemented in `src/lib/auth.ts`. It throws a redirect (Next.js `redirect()`) if the user is not admin. Called as the first line of `src/app/admin/layout.tsx`. Every nested page inherits the gate.

## Dashboard

The `/admin` page. Story-160 rebuilt it as a hero band + stat grid + workbench grid.

### Hero band

Personalised welcome, pending-refunds CTA if any requests are waiting, and an audit-log escape hatch.

### Stat tiles

| Tile                | Source                                                    |
| ------------------- | --------------------------------------------------------- |
| Total Students      | `User.count()`                                            |
| Total Courses       | `Course.count()`, caption from `PUBLIC_CURRICULUM_CLAIMS` |
| Active Enrollments  | `Enrollment.count({ status = ACTIVE })`                   |
| Total Revenue       | sum `Order.amount` where `status = COMPLETED`             |
| Certificates Issued | `Certificate.count()`                                     |
| Pending Refunds     | `Order.count({ status = REFUND_REQUESTED })`              |

### Workbench grid

Static `href` cards for the most common write paths: Create course, Add user, Review refunds, Audit log. Each links to the appropriate admin section.

### Recent activity

Last 5 `AuditLog` entries from `listAuditLogs.execute({ filters: { limit: 5 } })`.

### Pending actions

Count of open refund requests. Empty state when zero.

## Users

### List page (`/admin/users`)

Table columns:

| Column       | Sortable | Filterable                                                    |
| ------------ | -------- | ------------------------------------------------------------- |
| Email        | yes      | search                                                        |
| Display name | yes      | search                                                        |
| Role         | yes      | select (STUDENT / INSTRUCTOR / ADMIN)                         |
| Created      | yes      | date range                                                    |
| Last seen    | yes      | date range                                                    |
| Current tier | yes      | select (none / foundations / mastery / ultimate / all-access) |
| Enrollments  | no       | range                                                         |
| XP           | yes      | range                                                         |
| Streak       | yes      | range                                                         |
| Status       | yes      | active / deleted                                              |

Pagination: 50 per page. Search: server-side on email + display name. Filter combos: AND.

Row click -> `/admin/users/[id]`.

### User detail page (`/admin/users/[id]`)

Sections:

- **Profile** — email, display name, role, created, last seen. Admin actions: change role, send password reset, force re-verify, soft-delete.
- **Enrollments** — table of all enrollments (active + revoked). Admin action: revoke.
- **Orders** — table of all orders (completed, refunded, etc.). Click -> order detail.
- **Progress** — last 50 `ProgressEvent` rows. Read-only.
- **Quiz attempts** — last 50.
- **Simulator attempts** — last 50.
- **Badges** — list of awarded badges.
- **Certificates** — list of certificates (active + revoked).
- **Live class RSVPs** — list.
- **Audit log (as actor)** — all audit-log entries where this user was the actor.
- **Audit log (as target)** — all entries where this user was the target.

### Impersonate

An ADMIN can impersonate a STUDENT or INSTRUCTOR, but not another ADMIN. The action preserves the original admin session in a separate secure cookie, logs the impersonation, and plants the target user's session. Stopping impersonation restores the original admin session from that cookie.

### Add student (`/admin/users/new`)

Grants a subscription tier outside the checkout flow, for students who paid via bank transfer, GCash, or cash. Optionally records payment method, amount, and reference for bookkeeping. Creates the student account if it doesn't exist yet, sending a password-reset email. Can also revoke a grant (set tier to FREE). Uses `adminGrantSubscriptionAction`.

## Courses

### List page (`/admin/courses`)

Table: title, slug, tier, price, isPublished, isAllAccess, modules count, enrollments count, last updated. Filter by isPublished, isAllAccess, tier. Sort by displayOrder, title, createdAt, last updated.

### Course detail page (`/admin/courses/[id]`)

- Edit title, subtitle, description, hero image, instructor name/bio, tier, price, isPublished, isAllAccess, displayOrder.
- Module list with drag-to-reorder, add module, edit module.
- Quick stats: enrollments, revenue, completion rate, average XP.

### Course prerequisites (`/admin/courses/[id]/prerequisites`)

Manages course gating rules. Lists existing prerequisite rules and an add-form dropdown of all other courses (optionally scoped to a specific lesson). Removes rules and saves new ones. Students must complete the required items before they can enroll.

### Module editor (`/admin/courses/[id]/modules/[moduleId]`)

- Edit title, description, unlocksAt, display order.
- Lesson list with drag-to-reorder.
- Add lesson (modal: slug, title, type, estimatedMinutes, xpReward, mdxPath).
- Edit lesson (full editor with MDX preview, sourced from `content/curriculum/modules/`).
- Module-level analytics: completion rate, average time spent.

## Content

`/admin/content` is a hub page (Story-160) showing counts for courses, modules, and lessons via `GetAdminContentStats`, plus links to Courses and lessons, Quizzes, Simulator scenarios, and Download center.

## Quizzes

Quiz management lives at `/admin/quizzes`, NOT inside the module editor. The earlier "JSON blob nested in the module editor" design was never built and is superseded by the dedicated surface below.

### List page (`/admin/quizzes`)

Table of every quiz across all courses: title (with quiz id), parent course (with course id), passing score %, question count, and an Edit link to the detail page. The list comes from `AdminListQuizzes` which batch-hydrates parent courses via `Map<string, Course>`. Empty state shows a "No quizzes yet" message.

### New page (`/admin/quizzes/new`)

Form: quiz id, course dropdown (from `courseRepo.listAll()`), title, passing score (0-100), and a nested question/option editor (see `QuizEditor` client component). The form posts to `createQuizAction`, which calls `AdminCreateQuiz` — the same validation rules as on create apply (`createQuiz()` rejects with `invalid_passing_score`, `no_questions`, `question_missing_correct_option`, or `question_multiple_correct_options`).

### Edit page (`/admin/quizzes/[quizId]/edit`)

Loads the quiz + course via `AdminGetQuiz`. Quiz id and course are read-only. Title, passing score, and the question/option tree are editable via the same `QuizEditor` used on the new page. Form posts to `updateQuizAction`, which calls `AdminUpdateQuiz` (reconstructs the full quiz via `createQuiz()`, then a delete-and-recreate of child rows in a Prisma transaction per US-003). A Danger Zone card at the bottom holds the delete button; the `has_attempts` error from `AdminDeleteQuiz` (with `attemptCount`) is surfaced inline so the admin can see "this quiz has N attempts; reassign or remove them first."

### Nested question/option editor (`QuizEditor`)

Client component. Add/remove/reorder questions (up/down), add/remove options per question (radio-button semantics — exactly one correct answer per question). Serializes the current state to a hidden `questionsJson` form input on every state change so the server action can consume a single `FormData`.

### Lesson editor

The MDX editor is a textarea with live preview (client component). On save, the MDX is written back to `content/curriculum/modules/<path>` via the `ContentRenderer` port (or a dedicated `ContentWriter` port — TBD). The DB row's `mdxPath` stays the same. For now, lesson edits require a redeploy; a future story adds live content editing via Vercel Blob.

## Payments (Orders)

> **Terminology note:** There are no separate `Payment` or `Refund` tables. The `Order` entity is the single source of truth. The admin section is named "Payments" in the nav but all data comes from `Order`.

### List page (`/admin/payments`)

Table: created, user, course, amount, method, status, reference, paidAt. Filter by status, method, date range, course, user (search). Sort by created, amount, paidAt.

### Export (`/admin/payments/export`)

GET route, `?status=` filter param (one of `DRAFT`, `PENDING`, `PAID`, `FAILED`, `EXPIRED`, `REFUNDED`). Returns `text/csv` with headers: Order ID, Buyer Email, Course ID, Total (PHP), Status, Created At. Streams via `ReadableStream` to handle large exports. Admin check via `getSessionUserId()` + role check inline (same pattern as `audit-log/export`).

### Order detail page (`/admin/payments/[id]`)

- Order summary: amount, method, status, all timestamps, PayMongo IDs.
- Related enrollment.
- Refund history (if any).
- Admin actions:
  - **Mark as fraud** — sets status to `FLAGGED`, revokes enrollment, sends email to user (template), writes audit-log entry.
  - **Issue refund (override)** — calls `ProcessRefund` with override=true, requires reason (20+ chars).
  - **Re-fetch from PayMongo** — `IPaymentGateway.getOrder(paymongoOrderId)` to reconcile state.

## Refunds

### List page (`/admin/refunds`)

Table: requested, user, order, amount, status, isAdminOverride, completedAt, failureReason. Filter by status, isAdminOverride, date range.

### Refund detail (`/admin/refunds/[orderId]`)

- Full order detail.
- All related audit-log entries.
- For pending refunds: "Mark as failed" admin action (operator intervention when PayMongo times out).

## Simulators

### Index (`/admin/simulators`)

Per-scenario family row: scenarioKey, simulator, version, status, difficulty, estimated time. Click -> scenario edit or (for published/archived) a read-only view with a "Create new draft" button. Filter by simulator id.

### Simulator detail / edit (`/admin/simulators/[id]/edit`)

Draft rows render the full editable form: simulator id, name, description, difficulty, estimated minutes, input JSON schema, output JSON schema. Publish button sends `publishSimulatorScenarioAction`. Danger zone: Archive button sends `archiveSimulatorScenarioAction`. Published/archived rows are read-only; the "Create new draft from this version" button sends `createScenarioVersionDraftAction` and redirects to the new draft's edit page.

### Version history (`/admin/simulators/[id]/versions`)

Lists every version sharing the scenario's `scenarioKey`, oldest-first. Draft rows show Edit + Publish buttons; published/archived rows show "Create new draft from this version." Resolves scenarioKey from the `id` param and calls `listScenarioVersions.execute({ scenarioKey })`.

### Calibration (`/admin/simulators/[id]/[scenarioKey]/calibration`)

Per-dimension score bands (min/max) for the grader. `KNOWN_DIMENSIONS` from `ScorePolicy` drives the form. Posts to `setScenarioCalibrationAction`, which upserts `SimulatorScenarioCalibration` via `calibrationRepo`. The back link goes to the scenario's versions page.

## Live Classes

### List (`/admin/live-classes`)

Table: Title, Course, Scheduled, Duration, Status, Edit link. No "attended" column — the table shows status and the edit page handles the detail. Filter by past/upcoming via the component's own filtering.

### Class editor (`/admin/live-classes/[id]/edit`)

Create / edit: title, scheduledAt, durationMinutes, meetingUrl, status (`scheduled` / `cancelled` / `completed`), recordingUrl (optional, visible to students who RSVPd once status is "completed"). Status and course are read-only after creation. Danger zone: Cancel live class (`deleteLiveClassAction`).

Attendance marking is not surfaced in the admin panel directly — students mark a recording as watched themselves for XP. The admin records the `recordingUrl` instead.

## Discount Codes

### List (`/admin/discount-codes`)

Table: code, type, value, valid courses, valid from/until, max uses / current uses, isActive. Filter by isActive, type, valid (date).

### Editor

Form fields per `docs/db-schema.md` section on DiscountCode. Validation client-side + server-side. Audit-logged on save.

## Badges

### List (`/admin/badges`)

Table: slug, title, icon, isActive, awards count, criteria (human-readable summary).

### Editor

Form: slug, title, description, icon (Phosphor icon name), criteria (JSON, validated against the badge criteria schema), isActive. Audit-logged on save.

## Certificates

Certificate management lives at `/admin/certificates`, driven by `AdminListCertificates` + `AdminGetCertificate` use cases. The list/detail/revoke flow is intentionally read-mostly — issuance happens automatically via `IssueCertificate` when a course is completed; revocations go through `RevokeCertificate` + `revokeCertificateAction`.

### List page (`/admin/certificates`)

Table of every issued certificate: student (name + email + user id), course (title + course id), status (active/revoked badge), issued date, verification hash (truncated to `abcdef12...wxyz` form, with the full hash in the `title` attribute), and a View link to the detail page. Tab nav at the top: All | Active | Revoked, each showing a live count from `AdminListCertificates.execute({ status })`. Empty state shows "No certificates match the current filter."

### Detail page (`/admin/certificates/[id]`)

Server component. Loads the cert via `AdminGetCertificate` (notFound() on `certificate_not_found`). Renders three Card sections: Certificate (id, status, issued at, full verification hash, revoked-at + revoked-reason if revoked), Student (name, email, id), and Course (title, slug, id). For active certs, a fourth Card hosts the Revoke form (required `<textarea name="reason">`) which posts to `revokeCertificateAction`. The form is hidden when the cert is already revoked; the detail view instead shows the recorded revocation timestamp + reason. Success/error feedback via `?revoked=1` and `?error=<kind>` search params.

### Audit log

Every successful revoke (including the `wasAlreadyRevoked: true` idempotent-replay case) writes a `certificate.revoked` audit entry with metadata `{ reason, courseId, userId, wasAlreadyRevoked }` and the revoking admin's id as `actorId`.

## Resources (Download Center)

`/admin/resources` manages guides, templates, automation tools, cheat sheets, and handouts visible to students on the download center. STORY-098.

### List page (`/admin/resources`)

Table: title, category, file type, access tier, published status, download count. Filter by category (guide / template / automation_tool / cheat_sheet / handout), access tier (PREVIEW / STARTER / PRO), and free-text search. Pagination: 25 per page. "Add resource" button -> `/admin/resources/new`.

### New resource (`/admin/resources/new`)

Form: title, description, category, file type, upload file OR external URL (one required), access tier. Posts to `createResourceAction`. Validation errors redirected back with `?error=<kind>`.

### Edit resource (`/admin/resources/[id]/edit`)

Pre-filled form with all same fields as new, plus current file info, download count, and a danger zone: Unpublish (soft-hides) and Permanently delete (purges + removes from storage). Posts to `updateResourceAction` / `deleteResourceAction` / `purgeResourceAction`.

## Assignments

`/admin/assignments` tracks instructor-assigned student work (P1-02).

### List page (`/admin/assignments`)

Table: title, student, course, due date, status (PENDING / SUBMITTED / GRADED), grade, View/Grade link. Filter by status. Pagination: 25 per page. "Assign work" button -> `/admin/assignments/new`. For SUBMITTED rows the link reads "Grade"; for others it reads "View".

### New assignment (`/admin/assignments/new`)

Selects a course (from `adminListCourses.execute`), enters student email, title, description, and due date. Posts to `createAssignmentAction`.

### Assignment detail (`/admin/assignments/[id]`)

Shows status, due date, submitted date (if any), grade, feedback, and the work description. When status is SUBMITTED, renders the `GradeAssignmentForm` client component (score 0–100 + optional feedback). Posts to `gradeAssignmentAction`.

## Announcements

`/admin/announcements` manages site-wide banner announcements (P1-07). Every non-deleted row appears in the table.

### List page (`/admin/announcements`)

Table: title, level (INFO / WARNING / ERROR / SUCCESS), active toggle, display window, Edit link. Inline toggle posts to `setAnnouncementActiveAction`. "New announcement" button -> `/admin/announcements/new`.

### New / Edit announcement (`/admin/announcements/[id]/edit`)

Form via shared `AnnouncementForm` client component: title, body, level, active flag, dismissible flag, startsAt (optional datetime-local), endsAt (optional datetime-local). Posts to `createAnnouncementAction` or `updateAnnouncementAction`.

## Capstone

`/admin/capstone` is the human-reviewer queue for the capstone programme (LEARN-044). A submission progresses through statuses: submitted → returned → resubmitted → passed / not_passed.

### Queue page (`/admin/capstone`)

Lists every SUBMITTED submission, oldest first, with learner id, submission date, and artefact count. Empty state when the queue is clear.

### Review page (`/admin/capstone/[id]`)

Shows all six artefacts with their titles, kinds, statuses, and `rationale` payloads. Each artefact is displayed beside its rubric criterion (`goodLooksLike` label + description from `loadCapstoneManifest()`). If status is SUBMITTED, renders both a `ReturnCapstoneForm` (sends back for revision) and a `PassCapstoneButton` (marks passed). Non-SUBMITTED submissions show a read-only notice.

## Audit Log

### List (`/admin/audit-log`)

Table: occurredAt, actor (email), action, target type, target ID, IP, user agent. Filter by actor, action, targetType+targetId, date range. Sort by occurredAt desc.

Read-only. No edits. No deletes. The audit log is the source of truth for "who did what when."

### Export (`/admin/audit-log/export`)

GET route, query params match the list filter (actorId, action, targetType, targetId, from, to). Returns `text/csv` with columns: occurredAt, actorId, action, targetType, targetId, metadata. Streams via `ReadableStream`. No row limit (operator responsibility). Admin check inline via `getSessionUserId()` + role check (same as `payments/export`).

## Maintenance Mode

`/admin/maintenance` is a kill switch (P1-08). Toggling it on sets a `MAINTENANCE_MODE_ENABLED` flag; the Next.js proxy rewrites every non-admin request to the public `/maintenance` page with a 503 status. Admins with the bypass cookie can still reach `/admin/*`.

The form has a checkbox (enabled flag) and an optional message textarea (up to 500 chars). Posts to `toggleMaintenanceAction` → `AdminToggleMaintenance`. The page shows the current state (ON / OFF), when it was last changed, and by which admin id.

## Settings

### General (`/admin/settings`)

The page is split into four cards:

- **Site settings** — dynamic key/value editor. Any key can be created or replaced. The value field accepts JSON; plain strings are wrapped in quotes automatically. Lists all existing rows with their key, value, and description. Saving a key replaces its value. Uses `listSettings` (read) and `setSettingAction` (write) via `SetSettingForm`.
- **Environment** — read-only table of four required env vars: `DATABASE_URL`, `JWT_SECRET`, `PAYMONGO_SECRET`, `RESEND_API_KEY`. Shows Set / Missing status only, never the actual values.
- **Actor** — the current admin's id, email, and role.
- **Two-factor authentication** — opt-in TOTP enrollment. Admins can enable 2FA via an authenticator app using the `enableTwoFactorAction` flow, or disable it via `DisableTwoFactorForm` (password-confirmed). There is no enforcement that all admins must use 2FA.
- **Operations** — links to the audit log, download center, and email templates.

### Two-Factor Authentication (`/admin/settings/2fa-setup`)

Admin TOTP enrollment flow. Admins can opt in to 2FA via an authenticator app. There is no enforcement that all admins must use 2FA — it is currently opt-in only.

## Email Templates

`/admin/email-templates` manages the editable copy for all seven transactional email types: email verification, password reset, welcome, receipt, refund confirmation, certificate issued, live class reminder (STORY-095).

### List page (`/admin/email-templates`)

Table of all seven types showing the current subject line (or "(default copy)" if not customized), a Customized / Not customized badge, and the last-updated date. No search or filter needed (fixed set). Click -> edit.

### Edit page (`/admin/email-templates/[type]/edit`)

Four editable fields: Subject, Headline, Intro body, CTA button label. Shows the available `{{variables}}` for that email type inline. Saving calls `updateEmailTemplateAction` → `UpdateEmailTemplate`. The upsert-by-type repository contract means editing a type for the first time creates the row; subsequent saves update it.

## Audit Log: What Gets Logged

Every admin mutation. The use case writes the entry; the adapter persists it. The user detail page reads both "actor" and "target" entries.

| Action                         | Audit log entry                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Admin updates user             | `action: "user.updated"`, `targetType: "User"`, `targetId: userId`, `metadata: { changes }`             |
| Admin changes role             | `action: "user.role_changed"`, `metadata: { from, to }`                                                 |
| Admin issues refund override   | `action: "refund.override"`, `targetType: "Order"`, `targetId: orderId`, `metadata: { reason, amount }` |
| Admin marks order fraud        | `action: "order.flagged"`, `targetType: "Order"`, `targetId`, `metadata: { reason }`                    |
| Admin updates course           | `action: "course.updated"`, `targetType: "Course"`, `targetId`, `metadata: { changes }`                 |
| Admin creates discount code    | `action: "discount_code.created"`, `targetType: "DiscountCode"`, `targetId`, `metadata: { code }`       |
| Admin updates discount code    | `action: "discount_code.updated"`, `targetType: "DiscountCode"`, `targetId`, `metadata: { changes }`    |
| Admin creates badge            | `action: "badge.created"`, ...                                                                          |
| Admin revokes badge            | `action: "badge.revoked"`, `targetType: "BadgeAward"`, `targetId`, `metadata: { reason }`               |
| Admin issues certificate       | `action: "certificate.issued"`, ...                                                                     |
| Admin revokes certificate      | `action: "certificate.revoked"`, ...                                                                    |
| Admin creates live class       | `action: "live_class.created"`, ...                                                                     |
| Admin sets recording           | `action: "live_class.recording_set"`, ...                                                               |
| Admin updates settings         | `action: "settings.updated"`, `metadata: { changes }`                                                   |
| Admin impersonates user        | `action: "user.impersonated"`, `metadata: { onBehalfOfId, expiresAt }`                                  |
| Admin stops impersonation      | `action: "user.impersonation_ended"`, ...                                                               |
| Auth: sign-in success          | `action: "auth.signed_in"`, `targetType: "User"`, `targetId: userId`, `metadata: { ip, userAgent }`     |
| Auth: sign-in failure          | `action: "auth.signin_failed"`, `metadata: { email, ip, reason }`                                       |
| Auth: password reset requested | `action: "auth.password_reset_requested"`, ...                                                          |
| Auth: password reset completed | `action: "auth.password_reset_completed"`, ...                                                          |
| Auth: email verified           | `action: "auth.email_verified"`, ...                                                                    |
| Order: any state change        | `action: "order.<status>"`, ...                                                                         |

## What Lives Where

| Concern                | Domain                                      | Port                       | Use case                                    | Adapter                         |
| ---------------------- | ------------------------------------------- | -------------------------- | ------------------------------------------- | ------------------------------- |
| Role check             | `src/domain/entities/User.ts`               | `IAccessPolicy`            | every admin use case                        | `TierAccessPolicy`              |
| Impersonation logic    | `src/domain/entities/User.ts`               | —                          | `AdminImpersonate`, `AdminEndImpersonation` | —                               |
| Audit-log write        | —                                           | `IAuditLog`                | every admin use case                        | `PrismaAuditLog`                |
| CSV export             | `src/domain/shared/`                        | —                          | `AdminExportAuditLog`, `ExportPayments`     | —                               |
| Settings read/write    | `src/domain/values/`                        | `IPricingTierRepository`   | `AdminUpdateSettings`                       | `PrismaPricingTierRepository`   |
| Email template storage | `src/domain/entities/EmailTemplate.ts`      | `IEmailTemplateRepository` | `UpdateEmailTemplate`                       | `PrismaEmailTemplateRepository` |
| Maintenance toggle     | —                                           | —                          | `AdminToggleMaintenance`                    | —                               |
| Capstone review        | `src/domain/entities/CapstoneSubmission.ts` | —                          | `PassCapstone`, `ReturnCapstone`            | —                               |

The admin panel is the place where the SOLID architecture pays the most: every admin action is a use case that tests with `buildTestContainer()`, no mocking the real Prisma, no mocking the real PayMongo. The cost of adding a new admin section is one server action + one page + one use case + (sometimes) one repository method. No edits to the layout, the auth gate, or the audit log infrastructure.
