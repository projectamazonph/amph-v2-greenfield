# Admin Backend — Project Amazon PH Academy v2

**Status:** Approved
**Owner:** Ryan Roland Dabao
**Date:** 2026-07-17 (greenfield)

---

## Purpose

The admin panel is what lets Ryan (and any future co-admins) operate the platform: see who signed up, who paid, who refunded, fix typos in lessons, create discount codes, run the simulator scenario catalog, read the audit log. It is not a separate product. It is `src/app/admin/*`, gated by `requireAdmin()`, served from the same Next.js app.

Every admin route has search, filter, pagination. Every mutation is audited. Every action runs through a use case — no direct Prisma from page files. ADR-013, ISP, DIP.

## Roles

| Role | Access |
|------|--------|
| `STUDENT` | None on `/admin/*`. All admin routes 302 to `/dashboard`. |
| `ADMIN` | Read all admin pages. Mutate any non-privileged field. |
| `SUPER_ADMIN` | All ADMIN powers + impersonate + change another admin's role. |

Role is a column on `User`. Stored on the JWT. Re-checked on every admin request (no stale-allow).

## Layout

```
src/app/admin/
├── layout.tsx                       # requireAdmin() at the top
├── page.tsx                         # dashboard
├── users/
│   ├── page.tsx                     # list + search + filter
│   ├── [id]/
│   │   ├── page.tsx                 # user detail
│   │   └── impersonate/route.ts     # super-admin only
├── courses/
│   ├── page.tsx
│   ├── [id]/
│   │   ├── page.tsx
│   │   ├── edit/page.tsx
│   │   └── modules/[moduleId]/page.tsx
├── payments/
│   ├── page.tsx
│   └── [id]/
│       ├── page.tsx
│       └── override-refund/page.tsx
├── refunds/
│   ├── page.tsx
│   └── [id]/page.tsx
├── simulators/
│   ├── page.tsx
│   ├── [simulator]/
│   │   ├── page.tsx
│   │   └── scenarios/
│   │       ├── new/page.tsx
│   │       └── [scenarioId]/edit/page.tsx
├── live-classes/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── discount-codes/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── badges/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/edit/page.tsx
├── audit-log/
│   ├── page.tsx
│   └── export/route.ts             # GET ?query... returns CSV
└── settings/
    ├── page.tsx
    └── email-templates/page.tsx
```

`requireAdmin()` is implemented in `src/lib/auth.ts`. It throws a redirect (Next.js `redirect()`) if the user is not admin. Called as the first line of `src/app/admin/layout.tsx`. Every nested page inherits the gate.

## Dashboard

The `/admin` page. Summary tiles + charts.

### Tiles

| Tile | Source |
|------|--------|
| New signups (24h) | `User.count({ createdAt > now - 24h })` |
| New signups (7d) | `User.count({ createdAt > now - 7d })` |
| New signups (30d) | `User.count({ createdAt > now - 30d })` |
| Revenue (24h) | sum `Payment.amountMinor` where `status = COMPLETED` and `paidAt > now - 24h` |
| Revenue (7d) | same, 7d |
| Revenue (30d) | same, 30d |
| Active enrollments | `Enrollment.count({ status = ACTIVE })` |
| Refund rate (30d) | `Refund.count({ status = COMPLETED, completedAt > now - 30d })` / `Payment.count({ status = COMPLETED, paidAt > now - 30d })` |
| Simulator attempts (7d) | `SimulatorAttempt.count({ createdAt > now - 7d })` |
| Open refund requests | `Refund.count({ status = PENDING })` |

### Charts

- Revenue by day, 30d line chart.
- Enrollments by tier, 90d stacked bar.
- Top simulators by attempts, 30d horizontal bar.
- Signup funnel: visits → signups → verified → enrolled (last 30d, sourced from a lightweight `Visit` log if we add one; if not, funnel starts at signup).

## Users

### List page (`/admin/users`)

Table columns:

| Column | Sortable | Filterable |
|--------|----------|-----------|
| Email | yes | search |
| Display name | yes | search |
| Role | yes | select (STUDENT / ADMIN / SUPER_ADMIN) |
| Created | yes | date range |
| Last seen | yes | date range |
| Current tier | yes | select (none / foundations / mastery / ultimate / all-access) |
| Enrollments | no | range |
| XP | yes | range |
| Streak | yes | range |
| Status | yes | active / deleted |

Pagination: 50 per page. Search: server-side on email + display name. Filter combos: AND.

Row click → `/admin/users/[id]`.

### User detail page (`/admin/users/[id]`)

Sections:
- **Profile** — email, display name, role, created, last seen. Admin actions: change role, send password reset, force re-verify, soft-delete.
- **Enrollments** — table of all enrollments (active + revoked). Admin action: revoke.
- **Payments** — table of all payments. Click → payment detail.
- **Refunds** — table of all refunds (initiated by user or by admin).
- **Progress** — last 50 `ProgressEvent` rows. Read-only.
- **Quiz attempts** — last 50.
- **Simulator attempts** — last 50.
- **Badges** — list of awarded badges.
- **Certificates** — list of certificates (active + revoked).
- **Live class RSVPs** — list.
- **Audit log (as actor)** — all audit-log entries where this user was the actor.
- **Audit log (as target)** — all entries where this user was the target.

### Impersonate (super-admin only)

`/admin/users/[id]/impersonate` → POST. Sets a short-lived (1 hour) "impersonation" JWT with `impersonatorId` claim. The original admin's role is preserved; the impersonator's actions are logged with both `actorId` and `onBehalfOfId`. Stop-impersonating is one click in a persistent banner.

## Courses

### List page (`/admin/courses`)

Table: title, slug, tier, price, isPublished, isAllAccess, modules count, enrollments count, last updated. Filter by isPublished, isAllAccess, tier. Sort by displayOrder, title, createdAt, last updated.

### Course detail page (`/admin/courses/[id]`)

- Edit title, subtitle, description, hero image, instructor name/bio, tier, price, isPublished, isAllAccess, displayOrder.
- Module list with drag-to-reorder, add module, edit module.
- Quick stats: enrollments, revenue, completion rate, average XP.

### Module editor (`/admin/courses/[id]/modules/[moduleId]`)

- Edit title, description, unlocksAt, display order.
- Lesson list with drag-to-reorder.
- Add lesson (modal: slug, title, type, estimatedMinutes, xpReward, mdxPath).
- Edit lesson (full editor with MDX preview, sourced from `content/curriculum/modules/`).
- Quiz editor (JSON, validated against the quiz schema).
- Module-level analytics: completion rate, average time spent.

### Lesson editor

The MDX editor is a textarea with live preview (client component). On save, the MDX is written back to `content/curriculum/modules/<path>` via the `ContentRenderer` port (or a dedicated `ContentWriter` port — TBD). The DB row's `mdxPath` stays the same. For now, lesson edits require a redeploy; a future story (Sprint 13) adds live content editing via Vercel Blob.

## Payments

### List page (`/admin/payments`)

Table: created, user, course, amount, method, status, reference, paidAt. Filter by status, method, date range, course, user (search). Sort by created, amount, paidAt.

### Payment detail page (`/admin/payments/[id]`)

- Payment summary: amount, method, status, all timestamps, PayMongo IDs.
- Related checkout (raw event timeline).
- Related receipt (with link to download).
- Refund history (with link to each refund).
- Admin actions:
  - **Mark as fraud** — sets status to `FLAGGED`, revokes enrollment, sends email to user (template), writes audit-log entry.
  - **Issue refund (override)** — opens the override-refund page.
  - **Resend receipt** — calls `EmailSender.sendReceipt` again.
  - **Re-fetch from PayMongo** — `PaymentGateway.getPayment(paymongoPaymentId)` to reconcile state.

### Refund override page (`/admin/payments/[id]/override-refund`)

Form: amount (default full), reason (20+ char validation), notify user (yes/no default yes). On submit: `AdminIssueRefund` use case. Audit-logged.

## Refunds

### List page (`/admin/refunds`)

Table: requested, user, payment, amount, status, isAdminOverride, completedAt, failureReason. Filter by status, isAdminOverride, date range.

### Refund detail

- Full payment detail.
- All related audit-log entries.
- For pending refunds: "Mark as failed" admin action (operator intervention when PayMongo times out).

## Simulators

### Index (`/admin/simulators`)

Per-simulator card: total scenarios, active scenarios, attempts (7d / 30d), avg score, pass rate. Click → simulator detail.

### Simulator detail (`/admin/simulators/[simulator]`)

- Scenario list (table: slug, title, difficulty, category, required tier, isActive, displayOrder, attempts, avgScore, passRate).
- Filter by isActive, difficulty, category, tier.
- Click → scenario edit.

### Scenario editor (`/admin/simulators/[simulator]/scenarios/[scenarioId]/edit`)

- Edit slug, title, description, difficulty, category, required tier, input payload (JSON, validated against the scenario input schema for that simulator), ground truth (JSON), estimated minutes, XP reward, isActive, display order.
- Live "preview as user" mode (renders the scenario's UI for the admin).

## Live Classes

### List (`/admin/live-classes`)

Table: scheduled, title, capacity, RSVPs, attended, required tier, recording status, isCancelled. Filter by isCancelled, past/upcoming, tier.

### Class editor

- Create / edit: title, description, scheduledAt, durationMinutes, zoomUrl, capacity, required tier.
- After class: upload recording URL (`AdminSetLiveClassRecording`).
- Attendance: list of RSVPs with checkboxes; "Mark attended" submits `AdminMarkLiveClassAttendance`.

## Discount Codes

### List (`/admin/discount-codes`)

Table: code, type, value, valid courses, valid from/until, max uses / current uses, isActive. Filter by isActive, type, valid (date).

### Editor

Form fields per `docs/db-schema.md` §"DiscountCode". Validation client-side + server-side. Audit-logged on save.

## Badges

### List (`/admin/badges`)

Table: slug, title, icon, isActive, awards count, criteria (human-readable summary).

### Editor

Form: slug, title, description, icon (Phosphor icon name), criteria (JSON, validated against the badge criteria schema), isActive. Audit-logged on save.

## Audit Log

### List (`/admin/audit-log`)

Table: occurredAt, actor (email), action, target type, target ID, IP, user agent. Filter by actor, action, targetType+targetId, date range. Sort by occurredAt desc.

Read-only. No edits. No deletes. The audit log is the source of truth for "who did what when."

### Export (`/admin/audit-log/export`)

GET route, query params match the list filter. Returns `text/csv` with all matching rows. `AdminExportAuditLog` use case. No row limit (operator responsibility). For huge exports, recommend date range filtering.

## Settings

### General (`/admin/settings`)

Form: businessName, businessTin, businessAddress, businessEmail, supportEmail, earlyBirdLimit, earlyBirdPriceMinor, refundWindowDays, featureFlags (JSON editor). All fields are admin-only.

### Email templates (`/admin/settings/email-templates`)

List of email templates. Edit per template: subject, body (JSON, the React Email template props validated against a per-template schema). Preview pane on the right (rendered HTML).

## Audit Log: What Gets Logged

Every admin mutation. The use case writes the entry; the adapter persists it. The user detail page reads both "actor" and "target" entries.

| Action | Audit log entry |
|--------|-----------------|
| Admin updates user | `action: "user.updated"`, `targetType: "User"`, `targetId: userId`, `metadata: { changes }` |
| Admin changes role | `action: "user.role_changed"`, `metadata: { from, to }` |
| Admin issues refund override | `action: "refund.override"`, `targetType: "Payment"`, `targetId: paymentId`, `metadata: { reason, amount }` |
| Admin marks payment fraud | `action: "payment.flagged"`, `targetType: "Payment"`, `targetId`, `metadata: { reason }` |
| Admin updates course | `action: "course.updated"`, `targetType: "Course"`, `targetId`, `metadata: { changes }` |
| Admin creates discount code | `action: "discount_code.created"`, `targetType: "DiscountCode"`, `targetId`, `metadata: { code }` |
| Admin updates discount code | `action: "discount_code.updated"`, `targetType: "DiscountCode"`, `targetId`, `metadata: { changes }` |
| Admin creates badge | `action: "badge.created"`, ... |
| Admin revokes badge | `action: "badge.revoked"`, `targetType: "BadgeAward"`, `targetId`, `metadata: { reason }` |
| Admin issues certificate | `action: "certificate.issued"`, ... |
| Admin revokes certificate | `action: "certificate.revoked"`, ... |
| Admin creates live class | `action: "live_class.created"`, ... |
| Admin sets recording | `action: "live_class.recording_set"`, ... |
| Admin marks attendance | `action: "live_class.attendance_marked"`, ... |
| Admin updates settings | `action: "settings.updated"`, `metadata: { changes }` |
| Admin updates email template | `action: "email_template.updated"`, ... |
| Admin impersonates user | `action: "user.impersonated"`, `metadata: { onBehalfOfId, expiresAt }` |
| Super-admin stops impersonation | `action: "user.impersonation_ended"`, ... |
| Auth: sign-in success | `action: "auth.signed_in"`, `targetType: "User"`, `targetId: userId`, `metadata: { ip, userAgent }` |
| Auth: sign-in failure | `action: "auth.signin_failed"`, `metadata: { email, ip, reason }` |
| Auth: password reset requested | `action: "auth.password_reset_requested"`, ... |
| Auth: password reset completed | `action: "auth.password_reset_completed"`, ... |
| Auth: email verified | `action: "auth.email_verified"`, ... |
| Payment: any state change | `action: "payment.<status>"`, ... |
| Refund: any state change | `action: "refund.<status>"`, ... |

## What Lives Where

| Concern | Domain | Port | Use case | Adapter |
|---------|--------|------|----------|---------|
| Role check | `src/domain/users/rules/isAdmin.ts` | `AccessPolicy` | every admin use case | `TierAccessPolicy` |
| Impersonation logic | `src/domain/users/Impersonation.ts` | — | `AdminImpersonate`, `AdminEndImpersonation` | — |
| Audit-log write | — | `AuditLogRepository` | every admin use case | `PrismaAuditLogRepository` |
| CSV export | `src/domain/audit/csv.ts` | — | `AdminExportAuditLog` | — |
| Settings read/write | `src/domain/settings/` | `SettingsRepository` | `AdminUpdatePricingSettings` | `PrismaSettingsRepository` |
| Email template storage | `src/domain/email/Template.ts` | `EmailTemplateRepository` (future) | `AdminUpdateEmailTemplate` | (TBD) |

The admin panel is the place where the SOLID architecture pays the most: every admin action is a use case that tests with `buildTestContainer()`, no mocking the real Prisma, no mocking the real PayMongo. The cost of adding a new admin section is one server action + one page + one use case + (sometimes) one repository method. No edits to the layout, the auth gate, or the audit log infrastructure.
