# FEATURES — Project Amazon PH Academy v2

The full surface area of the product, in user-facing language. Every feature listed here is implemented, tested, and reachable from the running app.

Last reviewed: 2026-07-24. Sources: `docs/product-brief.md`, `docs/build-spec.md`, `docs/api-reference.md`, and the running codebase.

---

## 1. Authentication and Account

### Sign up
New students register with email + password. Password requirements: 10+ characters, mixed case, one digit, one symbol. Passwords hashed with `argon2id`. Rate-limited at 5 signups per IP per hour.

### Sign in
Email + password. JWT (HS256) in HttpOnly Secure SameSite=Lax cookie. Session lifetime 7 days, sliding. Failed login rate-limited at 5 per email per 15 minutes.

### Password reset
Email-based, 1-hour token, single use. Reset emails are queued through `ResendEmailSender` (the `EmailSender` port).

### Email verification
Required for paid checkout. Verification link sent on signup, 24-hour TTL. Re-send available every 60 seconds. Unverified users can browse but cannot enroll.

### Roles
Three roles: `STUDENT` (default), `ADMIN`, `SUPER_ADMIN`. Role is a column on `User`, not a join table. Single-tenant — no `orgId`. ADR-015.

### Account settings
Display name (required, 2–50 chars), email (read-only after verification), password change, notification preferences (per-channel toggles), data export (JSON download of all user-owned rows), account deletion (7-day grace, then hard delete + audit-log entry).

---

## 2. Course Catalog

### Browse
Three published courses visible to anonymous visitors on `/courses`: PPC Foundations, Accelerated Mastery, Ultimate Transformation. Each card shows price, what you get, and a CTA. No paywall preview. CTA leads to `/courses/[slug]` (auth-gated).

### Course detail page
Hero, instructor, learning outcomes (5–8 bullets), module list (collapsed by default), what's included list, price, "Enroll" CTA, refund-policy footnote. All copy from the `Course` record in the DB, not hardcoded.

### Pricing
Stored on `Course.priceMinor` (centavos, integer). Three tiers + admin-controlled all-access pass + early-bird discount. See `docs/business-layer.md` §"Pricing tiers".

### All-access pass
A fourth `Course` row, `slug = "all-access"`, `priceMinor = 1299900`, grants entitlement to every other course in the system. Admin-controlled. Sold only when admin sets `isActive = true`.

### Early-bird pricing
First 30 enrollments across all tiers pay ₱499. Implemented as a `PricingService` rule, not a discount code (so it composes with future discounts cleanly). Once the 30th enrollment completes, the early-bird price is gone forever.

### Discount codes
Admin-created. Single-use or multi-use. Percentage or fixed-amount off. Valid for specific courses or all. Stacking rules: one code per checkout, codes do not stack with early-bird. See `docs/business-layer.md` §"Discount codes".

---

## 3. Checkout and Payment

### Start checkout
`POST /api/checkout` (or the `startCheckoutAction` server action) takes a course slug and optional coupon code. Returns a `CheckoutSession` with a PayMongo-hosted URL. The session is stored in the `Checkout` table with a server-generated `idempotencyKey` to prevent double-charges on retry.

### Payment methods
GCash, Maya, GrabPay, credit/debit card (Visa, Mastercard, JCB), bank transfer (InstaPay / PESONet via `dob` and `dob_ubp` sources). All in Philippine peso. No currency conversion — ADR-008.

### Webhook verification
PayMongo sends `payment.paid`, `payment.failed`, `checkout.session.expired`, `refund.created`, `refund.updated`. Each request's `paymongo-signature` header is HMAC-SHA256 verified with the webhook secret. Failures return `401`. `HandlePaymentWebhook` use case is idempotent on the PayMongo event ID — replays are no-ops.

### Post-payment flow
On `payment.paid`, in a single DB transaction: create `Payment` row, create `Enrollment` (active, not revoked), create `Receipt` row, send confirmation email, issue first-touch XP (50 XP) + "New enrollment" badge. If any step fails, the transaction rolls back and the webhook returns 500 (PayMongo retries).

### Confirmation email
Sent via `ResendEmailSender` (the `EmailSender` port). React Email template. Includes course access link, receipt link, and refund-window note. CC: admin if the user is the 30th enrollment (early-bird milestone).

### Failed payment
On `payment.failed`, mark the `Checkout` as `failed`, do not create an enrollment, do not email the user a failure notice (PayMongo's hosted page already does that). Admin can see the failed checkout in `/admin/payments`.

### Abandoned cart
Checkouts that expire (30 minutes) are marked `expired` by a cron job. The `EmailSender` port's `sendAbandonedCheckoutReminder` is called once, 24 hours after expiry, only if the user has an unverified email or is a first-time visitor.

---

## 4. Enrollment and Access

### Entitlement model
`Enrollment` is the source of truth. One active `Enrollment` per `(userId, courseId)`. Revoked enrollments are kept (for audit) but filtered from access checks. Tiers map to courses 1:1: Foundations → Foundations course, Mastery → Mastery course, Ultimate → Ultimate course. All-access pass creates enrollments for all three at checkout time.

### Access checks
`AccessPolicy.canAccessCourse(user, course)` returns `{ allowed: true } | { allowed: false, reason }`. Used in: server actions (403 on deny), RSC pages (redirect to /pricing on deny), simulator pages (disable UI on deny). Single implementation, three call sites — ISP.

### Tier-gating for simulators
`AccessPolicy.canUseSimulator(user, simulator)` reads the simulator's `requiredTier` and the user's enrollments. Ultimate users get all five simulators; Mastery users get four (no Listing Audit); Foundations users get three (no Listing Audit, no Keyword Research). The simulators page reads from `simulatorRegistry.list()` and applies the policy per row.

### Refund flow
Within 7 days of `Payment.createdAt`, the user can `POST /api/refunds` with a reason. `RequestRefund` use case: validates window, calls `PaymentGateway.refund(paymentId, amount)`, marks `Enrollment.revoked = true`, sends refund email. After 7 days, the action returns `RefundWindowExpired`. The refund is a separate `Refund` row linked to the `Payment`.

### Refund admin override
Admins can issue refunds outside the window (e.g. chargeback response, goodwill). `AdminIssueRefund` use case requires a reason field of 20+ characters, logs to `AuditLog`, and emails the user.

---

## 5. Curriculum Delivery

### Course page
Lists modules in order, with progress per module (e.g. "3 of 5 lessons complete"). The page is RSC — `CourseService.getForUser(userId, courseSlug)` returns the course + progress + access decision in one DB trip.

### Module page
Lists lessons in order, locked or unlocked based on `unlocksAt` (a column on `Module`). Default: previous module must be completed first. Admin can set `unlocksAt` to a future date for scheduled drops.

### Lesson page
RSC. Loads the MDX from `content/curriculum/modules/<slug>.mdx`, runs it through the `ContentRenderer` port (which handles tables, links, code, images, embedded video), and renders. Progress is marked complete on scroll-bottom (debounced 1s) or on explicit "Mark complete" click. XP awarded on first completion only.

### Quizzes
Per-module quiz, 5–10 questions, multiple choice. Stored in `content/curriculum/quiz-questions.json`, imported via `scripts/import-amph-content.ts`. Pass threshold: 80%. Failed attempts: reviewable, can retry after 24 hours (rate-limited per `quiz_attempts` table). Passed: module marked complete, `+100 XP` awarded, next module unlocks.

### XP and leveling
`XPService` is a pure function: `(existingXp, event) → newXp`. Events: lesson complete (+10 to +50 by lesson type), quiz pass (+100), simulator scenario complete (+25), certificate issued (+500). Levels: every 500 XP = 1 level. Level is a derived value, not stored.

### Badges
Stored in `Badge` table (admin-defined). Awarded by use cases when criteria met. Examples: "First Quiz Pass", "5-Day Streak", "Bid Elevator: 10 Scenarios", "All 3 Courses Enrolled". Each badge has an icon (Phosphor), title, description, and `awardedAt`.

### Streaks
Daily lesson visit. `StreakService.recordVisit(userId, today)` — increments if last visit was yesterday, resets to 1 if older, no-op if already counted today. Stored on `User.currentStreakDays` and `User.longestStreakDays`. Streak breaks on a missed day.

### Progress persistence
All progress events flow through `ProgressService.record(userId, lessonId, event)`, which writes a `ProgressEvent` row (append-only, audit-friendly) and updates denormalized counters on `Enrollment` (lastLessonId, percentComplete). The append-only log is the source of truth; the counters are derived and rebuilt from the log by a daily job.

---

## 6. The Five Simulators

All simulators implement `Simulator<TInput, TOutput>` from `src/domain/simulators/Simulator.ts`. The page at `/tools/[tool]/[slug]` resolves the simulator by registry, validates the user's tier, loads the scenario, and renders the right UI. New simulator = one new domain module + registry entry. ADR-019, OCP.

### Campaign Builder
Build Sponsored Products, Sponsored Brands, or Sponsored Display campaigns. Steps: pick product → pick targeting (auto / manual / product) → set bids → structure ad groups → review. Scenarios are real Amazon category briefs (kitchen, electronics, garden, fitness, beauty) with a target ACoS, daily budget, and product list. The simulator grades the final structure against Amazon best practices and returns a score (0–100) with specific feedback per check. Time: 20–30 minutes per scenario. Tier: Foundations and above.

### Bid Elevator
Upload (or pick a scenario for) a search-term report. The pure function `recommendBids(rows, rules)` returns per-keyword recommendations: lower / raise / pause / keep, with reasons. Reasons include ACoS-vs-target, wasted spend, click share, opportunity score. Users see the recommendation, the math behind it, and a "what changed" diff. Time: 10–15 minutes. Tier: Foundations and above.

### Search Term Triage (STR Triage)
Same input as Bid Elevator (search-term report), different output. For each search term, the user sorts it into Keep / Pause / Optimize. The simulator compares their buckets against the "correct" bucketing (ground truth comes from a senior PPC review encoded in the scenario) and returns a score plus per-bucket accuracy. Time: 10–15 minutes. Tier: Foundations and above.

### Listing Audit
User pastes a product listing (title, bullets, description, backend keywords) or picks a scenario product. The simulator checks against a checklist of Amazon best practices: title length, brand presence, bullet structure, image count mention, backend keyword density, prohibited claims, etc. Returns a score (0–100) per section and an overall score, with concrete rewrites for each failing check. Time: 15–20 minutes. Tier: Mastery and above.

### Keyword Research
User enters a seed term. The simulator returns a starter keyword list with match-type recommendations (exact / phrase / broad), estimated bid ranges (in PHP), and a starter negative-keyword list. Pure function, no external API. Tier: Mastery and above.

---

## 7. Live Classes (Ultimate only)

### Schedule
`LiveClass` table. Admins create a class with title, description, scheduled time, Zoom link, capacity. Visible to Ultimate enrollees only.

### RSVP
`LiveClassRsvp` table. Unique on `(userId, liveClassId)`. Capacity enforced at RSVP time. Past classes are read-only.

### Reminders
24 hours and 1 hour before class, the `EmailSender` port sends a reminder with the Zoom link. No-show tracking is manual — admins mark attendance after class.

### Recordings
Post-class, admins upload a recording URL (Vercel Blob). Enrolled users see a "Watch recording" link on past classes. Recordings are not gated by attendance (goodwill gesture, not punitive).

---

## 8. Certificates

### Issue
On 100% module completion, the `IssueCertificate` use case generates a PDF (via `ReactPdfRenderer` port) and stores a `Certificate` row with a hash. The hash is `sha256(userId + courseId + issuedAt + SECRET)` truncated to 16 chars, URL-safe. The PDF is rendered to Vercel Blob, the public URL is stored.

### View
`/certificates/[hash]` shows the certificate (publicly viewable, no login). Verifiable by hash. The hash recomputation check is the source of truth — the page does not rely on whether a row exists in the DB.

### Download
`/certificates/[hash]/pdf` streams the PDF. Same hash route, different content type.

### Share
The certificate page has a "Copy verification link" button. LinkedIn "Add to profile" button generates the standard Licenses & Certifications URL with the verification hash embedded.

### Revocation
If a refund is processed after the certificate was issued, the certificate is marked `revoked = true` and the page shows a clear "revoked" badge with the revocation date. The PDF stays accessible for audit, with a watermark added on re-render.

---

## 9. Admin Panel (`/admin/*`)

Gated by `requireAdmin()`. Every route has search, filter, pagination. Every mutation logs to `AuditLog`. See `docs/admin-backend.md` for full spec.

### Dashboard
Summary tiles: new signups (24h / 7d / 30d), revenue (24h / 7d / 30d), active enrollments, refund rate, simulator attempts. Charts: revenue by day (30d), enrollments by tier (90d), top performing simulator scenarios.

### Users
Table: email, name, role, created, last seen, current tier, enrollments count, XP, streak. Search by email / name. Filter by role / tier / status. Row click → user detail page (full history: payments, enrollments, progress, attempts, badges, certificates, audit-log entries). Admin actions: change role, issue refund, revoke enrollment, send password reset, impersonate (super admin only, audit-logged).

### Courses
CRUD for courses, modules, lessons. Lesson editor uses a textarea with MDX preview. Quiz editor uses a JSON editor with validation. Module unlock date picker. Tier-to-course mapping. Drag-to-reorder modules and lessons.

### Payments
Table of all payments with status, amount, method, user, course, created, completed. Filter by status / method / date range. Row click → payment detail (full webhook event log, refund history, related receipt). Admin actions: mark as fraud, issue refund (with reason), resend receipt email.

### Refunds
Table of all refunds, link to source payment. Filter by date range / status (pending / completed / failed). Admin can also see refund requests awaiting admin override.

### Simulators
For each simulator: list of scenarios, scenario CRUD, completion stats (attempts, avg score, pass rate), per-scenario leaderboard (Ultimate only, opt-in). Admin can preview any scenario.

### Discount codes
CRUD. Per-code: code, type (percent / fixed), value, valid courses, valid from / until, max uses, current uses, single-use vs multi-use, per-user limit.

### Audit log
Append-only, filterable by actor / target / event type / date. Read-only. Export to CSV.

### Settings
Pricing tier prices, refund window (default 7), early-bird limit (default 30), email templates (subject + body, no HTML editor — JSON for the React Email template, validated against the schema), feature flags (per-feature on/off).

---

## 10. Observability

### Structured logging
Pino logger (`PinoLogger` port). Every log line has `requestId`, `userId` (if authed), `route`, `latencyMs`. Redaction of `password`, `token`, `cookie`, `authorization`, `paymongo-signature` headers, and any field matching `*.secret` or `*.token`.

### Error tracking
Sentry (`SentryTracer` port). Server, client, and edge configs. Source maps uploaded on release. User context attached on auth. PII filtered (no email / name in breadcrumbs).

### Tracing
Server actions are wrapped in `withActionTracing` HOC. Captures input shape (sanitized), output shape (without PII), duration, status. Emits to Sentry and to structured logs.

### Rate limiting
`RateLimiter` port, Upstash Redis adapter. Applied at: signup, signin, password reset, email verification resend, checkout, refund request, quiz retry, simulator attempt. Each has its own bucket.

### Performance monitoring
Web Vitals (LCP, FID, CLS) sent to Sentry. Lighthouse CI runs on every PR; perf ≥ 0.85, a11y / bp ≥ 0.95, seo ≥ 0.9, LCP ≤ 4000ms, TBT ≤ 300ms.

---

## 11. Security and Privacy

### Multi-tenant isolation
Single tenant (one org), but per-user isolation. Every server action, route handler, and Prisma query that touches user-owned data goes through a guard. See `docs/security/tenant-isolation.md` for the full table. Audited Sprint 12 / STORY-055.

### Authentication
JWT in HttpOnly Secure SameSite=Lax cookie. No JWT in localStorage. Server-side session validation on every server action and RSC.

### Authorization
Role check at the route boundary (`requireAdmin()`), then per-resource access check (`AccessPolicy`) inside the use case. Belt + suspenders.

### Input validation
Zod at every server action and route handler. Reject early. Return `Result.err(ValidationError)` with field-level details.

### Output encoding
React handles it by default for RSC. For PDF generation, `ReactPdfRenderer` escapes user input. For email, `ReactEmailRenderer` escapes by default.

### CSRF
Server actions are CSRF-protected by Next.js automatically (origin check). Webhooks verify their own signatures.

### Secrets
All secrets in env vars. `.env.example` checked in, `.env*` gitignored. `gitleaks` in CI.

### Headers
CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy. See `docs/security/security-audit-2026-07-13.md`.

### Data export and deletion
User can request a full data export (JSON zip). 7-day grace before deletion. Audit-log entries are kept (with user PII redacted to `User:deleted-<id>`).

---

## 12. Internationalization (planned, not yet shipped)

UI strings live in `src/lib/copy/` keyed by `copyId`. No inline strings in components. The copy catalog is auto-extracted at build time. Tagalog / Cebuano translations are in `src/lib/copy/tl/` and `/ceb/`. Default: `en`. User can switch in account settings. v2 ships English only; translations are a v2.1 feature, ADR-020.

---

## 13. What's Not In v2

Deliberately out of scope. Tracked in `docs/decisions.md`:

- No AI features. ADR-003.
- No multi-org / multi-tenant. ADR-015.
- No subscription billing. One-time only. ADR-009.
- No multi-currency. PHP only. ADR-008.
- No mobile app. Web only, mobile-first responsive. ADR-010.
- No community forum (in v2). Linked Discord instead. ADR-011.
- No instructor-led cohort scheduling beyond live classes. ADR-012.
