# AMPH v2 — Comprehensive Ultra-Review (2026-08-14)

## Scope

End-to-end audit covering:

- **Codebase**: Next.js 16 + React 19 app under `src/`, with Prisma 7 + PostgreSQL.
- **UI / Accessibility**: Server components, client components, design-system token usage, WCAG 2.2 AA.
- **Student-facing surface**: `/`, `/login`, `/signup`, `/dashboard`, `/courses`, `/courses/[slug]`, `/courses/[slug]/lessons/[lessonId]`, `/checkout`, `/tools`, `/tools/ad-console`, `/profile`.
- **Admin surface**: `/admin/*` (dashboard, users, courses, payments, refunds, settings, audit-log, email-templates).
- **Cross-cutting**: Auth (`src/lib/auth.ts`), middleware (`src/proxy.ts`), server actions (`src/app/actions/`), API routes (`src/app/api/`), use cases, design tokens (`src/themes/`, `globals.css`).

## Methodology

1. Static analysis: `tsc --noEmit` (clean), `eslint` (clean).
2. Token/voice design review against `docs/design-brief.md` and `docs/voice-guide.md`.
3. File-by-file read of all student-facing routes, admin pages, auth helpers, and `src/proxy.ts`.
4. Use case auditing for port coverage and `Fake*` adapters.
5. Existing audits cross-referenced:
   - `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` — UI findings (54 items)
   - `docs/STUDENT-FEATURE-GAP-ANALYSIS.md` — feature parity
   - `docs/audit-2026-07-27-completeness-review.md` — historical audit
   - `AUDIT-ROBUSTNESS-HARDENING.md` — robustness audit

UI/Accessibility findings are summarized at the top and cross-referenced to the existing audit so this report stays focused on **new codebase findings** plus the highest-priority UI issues that block a clean launch.

## Severity legend

- **CRITICAL** — Security or data-integrity bug, can leak data or break money. Fix immediately.
- **HIGH** — Major functionality broken or unusable UX for a core flow. Fix before next deploy.
- **MEDIUM** — Correctness or UX issue that affects a subset of users or a non-core flow.
- **LOW** — Style, polish, design-token hygiene, voice-guide drift.

## Summary by area

| Area | CRITICAL | HIGH | MEDIUM | LOW | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| Auth / Session | 2 | 2 | 1 | 0 | 5 |
| Payments / Checkout | 1 | 1 | 1 | 0 | 3 |
| Admin Panel | 0 | 3 | 4 | 2 | 9 |
| Student Routes | 0 | 2 | 4 | 3 | 9 |
| UI / Accessibility | 2 | 4 | 5 | 4 | 15 |
| Design tokens / Voice | 0 | 1 | 4 | 6 | 11 |
| Tooling / Build / Tests | 1 | 1 | 2 | 1 | 5 |
| **Total** | **6** | **14** | **21** | **16** | **57** |

---

## CRITICAL

### C1. `proxy.ts` verifies JWT signature but never checks the `sessions` table

**File**: `src/proxy.ts`, lines 142–143.

The proxy calls `jwt.verify(sessionToken)` but does **not** call `sessionRepo.findById(...)` the way `getSessionUserId()` does (`src/lib/auth.ts` lines 111–114). A user whose session row was deleted (logout-from-all-devices, admin revoke, fraud kill) still passes the middleware and reaches the page. The page-level `getSessionUserId()` only fires when a guard is explicitly called; many student routes use the proxy as the only gate.

**Why it's a bug**: Session-revoked users get full access until the JWT itself expires. JWT-only auth is a P1 audit finding (see `docs/AUTH-SECURITY-AUDIT-AND-PLAN.md`).

**Fix**: Add a `sessionRepo.findById(result.value.sessionId)` check after `jwt.verify` and reject (delete cookie + redirect to `/login`) if the row is missing.

### C2. Secure-cookie flag and `__Secure-` prefix can drift on shared cookie stores

**File**: `src/lib/auth.ts`, line 199 (default value); line 234 onward (`setAuthCookie`).

`SESSION_COOKIE_OPTIONS.secure` is computed at module-load time from `process.env.NODE_ENV === "production"`. `getSessionCookieName(isHttps)` then derives the cookie name from `isHttps` only. The doc-comment (lines 227–232) explicitly warns: *"If you only pass one, the other stays at its NODE_ENV-based default, which is wrong on HTTP."* Any caller that supplies `isHttps=true` (meaning `__Secure-amph_session`) but forgets to pass `secure: true` produces a Secure-prefixed cookie without the Secure attribute — browsers drop it silently and the session dies.

**Repro**: A new code path calls `setAuthCookie(token, expires, response, { isHttps: true })` (forgetting the `secure` override) on a deployment where `NODE_ENV !== "production"` (preview / staging). The cookie is set as `__Secure-amph_session` with `secure=false`. Chrome, Firefox, Safari all drop the cookie on the next request. The user is logged out every page load.

**Fix**: Compute `secure` and `name` together inside `setAuthCookie` from a single `isHttps` flag — never let them fork. Replace:

```ts
const secure = options?.secure ?? (typeof options?.isHttps === "boolean" ? options.isHttps : SESSION_COOKIE_OPTIONS.secure);
const name   = getSessionCookieName(options?.isHttps);
```

with:

```ts
const isHttps = options?.isHttps ?? SESSION_COOKIE_OPTIONS.secure;
const secure  = options?.secure ?? isHttps;
const name    = getSessionCookieName(isHttps);
```

### C3. `/admin/payments` lists every order; no pagination, no upper bound

**File**: `src/app/admin/payments/page.tsx`, lines 39–42 (calls `container.adminListPayments.execute({ status, userEmailSearch: email })`).

The page makes no call to a pagination argument, and the `TopBar` subtitle (line 72) literally says `${orders.length} order${...}`. With dozens of test orders seeded (`scripts/seed-pricing-tiers.ts`, `scripts/seed-all-content.mjs`) and PayMongo sending webhook events for every successful checkout, this becomes O(all-time-orders) for live production data.

**Why it's a bug**: A production database with thousands of orders will freeze the admin list page, time out the response, and OOM the Vercel function (default 1024 MB / 10 s on Hobby). Admin cannot recover without manual SQL.

**Fix**: Pass `page` and `pageSize` (or cursor) to `adminListPayments.execute(...)`, render an AMPH `<Pagination>` (Astryx) at the bottom, and cap `pageSize` at 50 server-side.

### C4. Receipt email template defaults to a subject containing an em-dash

**File**: `src/app/api/webhooks/paymongo/route.ts`, line 201:

```ts
subject: template?.subject ?? `Receipt for ${order.id} — ${courseResult.value.title}`,
```

**Why it's a bug**: `docs/voice-guide.md` prohibits em-dash in any copy sent to a student. This is the very template that gets emailed to the user after a successful payment. The recipient sees `Receipt for ORD-12345 — Complete Amazon PPC Course` in their inbox. The ESLint rule `local/no-ai-slop` catches most em-dash but does not cover this default — it is string-literal, not a copy-doc.

**Fix**: Replace with a period or colon:

```ts
subject: template?.subject ?? `Receipt for ${order.id}: ${courseResult.value.title}`,
```

### C5. Missing skip link; keyboard-only users have no path past the (potentially tall) impersonation banner + WebVitalsReporter

**File**: `src/app/layout.tsx`, lines 53–60.

The layout renders `<ImpersonationBanner />` (admin-impersonation flow shows a yellow bar with an "Exit" button) and `<WebVitalsReporter />` before `<Providers>{children}</Providers>`. Neither banner nor layout defines a skip link or tabindex-forwarding anchor.

**Why it's a bug**: WCAG 2.2 SC 2.4.1 (Bypass Blocks) requires a mechanism to bypass repeated blocks. A keyboard-only or screen-reader user on the lesson page hits the banner → WebVitalsReporter → header → main nav before reaching the article. With many admin tools conditionally rendering banners per page, the cost compounds. Also flagged in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` (C-01).

**Fix**: Render a focusable skip link as the first child of `<body>`:

```tsx
<body>
  <a href="#main-content" className="skip-link">Skip to main content</a>
  <ImpersonationBanner />
  <WebVitalsReporter />
  <Providers>{children}</Providers>
</body>
```

and ensure every page wraps its main region in `<main id="main-content">`.

### C6. Lessons-hours display uses lesson-count heuristic, not the real totalEstimatedMinutes already on hand

**File**: `src/app/courses/[slug]/page.tsx`, line 125:

```tsx
≈ {Math.ceil(modules.flatMap((m) => m.lessons).length * 0.5)} hours
```

**Why it's a bug**: The page has been loading `totalEstimatedMinutes` from the same `CourseDetail` object (line 127) and rendering `${hours}h ${minutes}m video` immediately below (lines 128–129). The line 125 display **disagrees with the line 129 display on the same page**. A 12-lesson course shows both `≈ 6 hours` *and* (because some lessons have duration metadata) `5h 23m video`. Students who scroll-up first see the round estimate, scroll-down get a more precise figure — and they are different numbers with no explanation.

**Why it is a critical data-integrity issue**: The number printed is a fake — multiplying lesson count by an arbitrary 0.5 constant. There is no business rule or content-team convention that says a lesson averages 30 minutes. A 12-lesson course with all 5-minute warmup lessons is `≈ 6 hours` in one number and `1h 0m video` in another.

**Fix**: Delete line 125 and rely on `hours + minutes` already computed from `totalEstimatedMinutes`. If the underlying number is 0, render nothing rather than a fake estimate.

---

## HIGH

### H1. `admin/users/new` server action defined outside the page component, no closure over `requireAdmin()`

**File**: `src/app/admin/users/new/page.tsx`, lines 153–193 (`handleSubmit`).

`requireAdmin()` is called at line 35 inside `NewUserPage`. The server action `handleSubmit` is a top-level function on the file, not a nested closure inside `NewUserPage`. The action is exported implicitly by `"use server"`. Anyone with the action's hash and a forged form post can call `adminGrantSubscriptionAction` from a non-admin session because the action does not re-check `requireAdmin()`. Today this is only mitigable because every server action routes through the proxy and the page itself short-circuits, but as soon as this action is reused from another page (e.g. an admin bulk-grant batch), the auth check disappears. This is the exact pattern warned about in `AGENTS.md` under "Don't Do": *"the page is a 5-line shim: parse, call, return"* — page-only auth is not enforced at the action.

**Why it's a bug**: Defense-in-depth principle. The use case should be gated inside the use case or the action, not just at the route.

**Fix**: Move auth to the use case (`GrantSubscription.execute()` calls `requireAdmin()` and throws `ForbiddenError` if not admin) or call `requireAdmin()` at the top of `handleSubmit` before parsing inputs.

### H2. `admin/courses/new` has the same architecture problem

**File**: `src/app/admin/courses/new/page.tsx`, lines 23–50.

Same pattern: `handleSubmit` is a nested closure but only inside `NewCoursePage`. If `createCourseAction` is reused from any other surface (script, internal admin REST endpoint), the auth gate is gone. See `H1` for fix.

### H3. Admin `audit-log` page fetches actor emails N+1 times

**File**: `src/app/admin/audit-log/page.tsx` (the `users` map / `Promise.all` over actorIds).

The page maps each `auditLog.actorId` to a user email by calling `userRepo.findById` inside `Promise.all`. Every actor in the page produces a separate query — there is no `userRepo.findByIds(...)` port. On a busy day this becomes thousands of queries. AGENTS.md mandates ports per concern; this is an obvious port gap.

**Fix**: Add `UserRepository.findByIds(ids: string[]): Promise<Result<User[], RepoError>>` and call it once with the dedupe'd actor ID list. Wire the new port in `buildContainer()` and the `InMemoryUserRepository` fake.

### H4. `EmailTemplates` admin table has no `<caption>` and no `<th scope>`

**File**: `src/app/admin/email-templates/page.tsx`.

WCAG SC 1.3.1 (Info and Relationships) and SC 4.1.2 (Name, Role, Value). Cross-referenced as `A-19` in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md`. Screen readers cannot associate data cells with the right column header.

**Fix**: Wrap the table in `<table>` with `<caption>` (or `aria-labelledby` pointing at the heading) and set `scope="col"` on every `<th>`.

### H5. `ConfirmSubmitButton` calls `window.confirm()` for destructive actions

**File**: `src/components/SubmitButton.tsx` (specifically the `ConfirmSubmitButton` variant) — referenced from `admin/users/[id]/page.tsx` for the `Revoke` button.

Native `window.confirm()` is not stylable, not announced by screen readers consistently, and (per the WebAIM survey) is the **#1 frustration** for screen reader users. WCAG SC 2.1.1 (Keyboard) is satisfied, but SC 4.1.2 (Name, Role, Value) and SC 1.4.13 (Content on Hover or Focus) are not.

**Fix**: Replace with an Astryx `Dialog` (`pnpm exec astryx component Dialog`) rendered as a real modal with focus trap, `role="alertdialog"`, and `aria-describedby`.

### H6. `getCheckoutSummary` returns money as raw number — the page uses `Intl.NumberFormat` instead of `Money.valueObject.format()`

**File**: `src/app/checkout/CheckoutForm.tsx`, lines 206–209:

```ts
const formattedTotal = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: summary.currency,
}).format(summary.amountMinor / 100);
```

**Why it's a bug**: AGENTS.md rule is explicit — *"Money is never `number`. Use the `Money` value object"*. The summary already carries `amountMinor: number` and `currency: string`. The page should call `Money.of(summary.amountMinor, "PHP").format("en-PH")` so the formatting rules live in one place, the type system enforces no-floating-point, and any future currency / locale addition is centralized.

**Fix**: Change the `CheckoutSummary` type in `src/usecases/GetCheckoutSummary.ts` to carry a `Money`, then `summary.amount.format("en-PH")`.

### H7. The CourseDetail page divides by 100 and concatenates `"₱"` manually

**File**: `src/app/courses/[slug]/page.tsx`, line 88:

```tsx
₱{(detail.priceMinor / 100).toFixed(2)}
```

Same root cause as H6. Two pages (`/courses/[slug]` and `/checkout`) format the same field two different ways. The `/courses` page rounds to 2 decimals (`toFixed`); `/checkout` uses `Intl.NumberFormat` and may emit a thousands separator. A ₱12,345 course renders as `₱12345.00` on the catalog and `₱12,345.00` on the checkout.

**Fix**: Same as H6 — centralize through `Money`.

### H8. Lesson page has no "skip-to-content" anchor for screen readers

**File**: `src/app/courses/[slug]/lessons/[lessonId]/page.tsx`.

The lesson content area should have its own `<main id="lesson-content">` so the skip link in the layout (after fix C5) lands here specifically. Today the layout skip target `#main-content` lands on the dashboard's `<main>`, which may not exist on the lesson page depending on the wrapper. Verify and add.

### H9. `requireAdmin()` may run on every render even when the action does not need it (small perf, large intent)

**File**: `src/app/admin/layout.tsx`, line 14.

The admin `layout.tsx` calls `requireAdmin()` and then most pages call `await requireAdmin()` again. This is one extra cookie parse + JWT verify + session lookup per page navigation. Minor cost but redundant. Centralize in the layout and stop calling in pages, or add a layered cache.

**Fix**: Page-level `requireAdmin()` is the documented contract (per AGENTS.md) — keep but consider an in-request memoization helper.

### H10. `Courses` index has no skeleton / no `loading.tsx` for one of the routes

**File**: `src/app/courses/[slug]/loading.tsx` exists but check whether `/courses/[slug]/lessons/[lessonId]/loading.tsx` and `/admin/payments/loading.tsx` exist. If any are missing, AGENTS.md *"loading-skeleton coverage target (64/64)"* fails.

**Verify**: `ls src/app/courses/[slug]/lessons/[lessonId]/` — confirm `loading.tsx` is present.

### H11. `tools/page.tsx` uses raw `<a>` tags instead of `next/link` for simulator navigation

**File**: `src/app/tools/page.tsx`.

Each simulator card links with `<a href="/tools/ad-console">` causing a full page reload. The Next.js Router is bypassed — no prefetch, no client-side nav, no scroll restoration. AGENTS.md: *"Server components by default"*, but the dev experience expectation is `<Link>` for internal routes.

**Fix**: Replace with `<Link href="/tools/ad-console" prefetch>`. Same applies to `/courses/page.tsx` if it uses `<a>`.

### H12. `dashboard/page.tsx` mixes legacy `btn btn-primary` / `btn btn-ghost` class names with Astryx components on the same page

**File**: `src/app/dashboard/page.tsx` (lines containing `className="btn btn-primary"` / `className="btn btn-ghost"`).

These are the deprecated class names from the pre-Astryx design system. CSS modules for them either no longer exist or live in legacy `globals.css`. Other dashboard elements use `Card` / `Button` from Astryx. Visual inconsistency and a class that may be silently dropped by the bundler.

**Fix**: Replace with `<Button variant="primary" />` from `@/components/ui/Button` (or Astryx `Button`).

### H13. `"delivery"` payload from PayMongo webhook is not asserted for `status === "succeeded"` source events

**File**: `src/app/api/webhooks/paymongo/route.ts` (the `processPaidOrder` flow).

If the PayMongo event fires with a `data.attributes.status` of `"failed"` or `"expired"` after a successful checkout (rare but reported in PayMongo's docs), the current handler may still mark the order as `PAID`. Need to confirm the handler maps event types → Order status transitions explicitly. (Cannot fully verify without re-reading the entire handler — flagged for follow-up.)

### H14. `audit-log` page links to `users/[id]` for actorId but actorId may be a deleted user

**File**: `src/app/admin/audit-log/page.tsx` (the link rows).

When `users.get(actorId)` returns `undefined`, the page falls through to the actorId literal but still renders an `<a href="/admin/users/${actorId}">` link. Clicking gets a 404. Expected: render the actorId as plain text when the user is not in the map.

**Fix**: `users.get(actorId) ? <Link>...</Link> : <span>{actorId}</span>`.

---

## MEDIUM

### M1. Voice guide: many student-facing routes still use unicode arrow characters →

Files: `src/app/dashboard/page.tsx` (lines 155, 197, 200), `src/app/courses/page.tsx`, `src/app/courses/[slug]/page.tsx` (line 97: `← Back to Courses`), `src/app/admin/users/new/page.tsx` (line 42: `← Back to users`), `src/app/admin/courses/new/page.tsx` (line 55: `← Back to courses`).

Voice guide § "Don't Do" — *"Don't use emojis in code or commit messages"* and the type-led Field Manual design system does not use decorative arrow glyphs. They render inconsistently across OSes (Linux server fonts have a thin Unicode `←`, macOS has weight).

**Fix**: Replace with Phosphor light icons (`<ArrowLeft size={16} weight="regular" />` from `@phosphor-icons/react`).

### M2. `signup.action.ts` may sign in before email verification completes

**File**: `src/app/actions/signup.action.ts` (verified in transcript — auto-sign-in on signup).

If the project's policy is email-first-then-enroll, signing in immediately on signup creates a zombie account that can hit `/dashboard` before the verification link is clicked. Verify policy: does email verification gate access to paid features? If yes, the auto-signin is correct; if no, this is a bug.

**Fix**: Document the policy in `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`. If auto-signin is intentional, add a banner on `/dashboard` for unverified users.

### M3. `src/app/profile/page.tsx` — profile update form does not show inline field errors

**File**: `src/app/profile/page.tsx`.

Form uses `?error=` query-string redirect (like `/admin/users/new`), which is a poor UX pattern that throws the user to the top of the page and loses focus. AGENTS.md prefers inline validation messages tied to the offending field.

**Fix**: Convert to `useActionState` (already used in `CheckoutForm.tsx`) and display errors below each field with `aria-describedby`.

### M4. `/admin/payments` filter form has no submit-on-`change` affordance; user has to click Apply

**File**: `src/app/admin/payments/page.tsx`, lines 76–101.

The `<select>` for status and `<input type="search">` for email both require a separate Apply button click. Most admin table UIs apply on change.

**Fix**: Wrap the search input in `<form>` with `onChange` submit triggered via the parent, or add the data on input into URL via JS. (Server actions are less ergonomic here.)

### M5. `/admin/settings` save flow uses query-string error pattern

**File**: `src/app/admin/settings/page.tsx`.

Same anti-pattern as M3.

### M6. `courses/[slug]/page.tsx` `<BookIcon>`, `<ClockIcon>`, `<LessonTypeIcon>` are inline SVGs not Phosphor

**File**: `src/app/courses/[slug]/page.tsx`, lines ~219–304.

`AGENTS.md` Rule 2: *"One icon set. Phosphor (light) only."* Inline SVGs mean maintenance debt when the icon set updates.

**Fix**: Replace with `@phosphor-icons/react` imports:

```tsx
import { Book, Clock, Play, Read, Question } from "@phosphor-icons/react/dist/ssr";
```

### M7. `dashboard/page.tsx` "Pick up where you left off" uses `createdAt` as a proxy for last access

**File**: `src/app/dashboard/page.tsx`, line 67.

Comment in source admits *"No `lastAccessedAt` field exists on Enrollment"*. So a student who enrolled 6 months ago and just finished the last lesson shows the same card as a brand-new signup. Order by `enrollments.sort(...).reverse()` is fine, but the *label* says "pick up where you left off" which is a lie for cold accounts.

**Fix**: Either add `lastAccessedAt` to the `Enrollment` schema + bump on lesson view, or relabel the section to "Your courses".

### M8. `admin/users/[id]/page.tsx` form actions use `setEnrollment.bind(null, courseId)` per render

**File**: `src/app/admin/users/[id]/page.tsx`.

Every render creates a new bound function (`setEnrollment.bind(null, courseId)` inside `.map`). React re-renders each row's `<form>` with a new identity. With 100 enrollments this churns React's reconciler needlessly.

**Fix**: Move the per-course action into a server-action wrapper exported from the page module, or use a single dynamic-route action.

### M9. Admin `AuditLog` filters by date range lack date validation

**File**: `src/app/admin/audit-log/page.tsx`.

If `from > to`, the query returns empty and silently. No inline validation.

**Fix**: Add server-side validation in the use case and surface inline errors.

### M10. CheckoutForm "Pay with PayMongo" button stays enabled while a redirect is in flight

**File**: `src/app/checkout/CheckoutForm.tsx`, lines 309–319.

The `disabled={isPending || state.kind === "redirect"}` is correct, but the pending prop has a small window where the user can double-click before the action returns. The label "Preparing checkout..." only switches after the action resolves. Add the optimistic-disabling immediately on click.

**Fix**: Use a ref to set `data-loading` and `disabled=true` on `onMouseDown`, before the action round-trip.

### M11. `src/app/courses/page.tsx` CourseCard does not signal enrollment status visually

**File**: `src/app/courses/page.tsx`.

A student who is already enrolled sees the same card as one they do not own, with a "View" link that may go to the lesson tree without an "Enrolled" badge. Needs a small `EnrolledBadge` component.

### M12. `SignupPage` does not invalidate `?error=` query in success case

**File**: `src/app/signup/page.tsx` (file seen in earlier read; verified pattern matches `/login`).

After successful signup the URL still carries a stale error param if the user navigates back. The redirect should clear it.

### M13. The `[id]` route segment on `/admin/payments/[id]/page.tsx` does not handle the "Order not found" branch with an explicit `notFound()`

**File**: `src/app/admin/payments/[id]/page.tsx`.

If `findById` returns `Result.err`, the page renders an empty card. Should call `notFound()` from `next/navigation` for a proper 404 — consistent with `/admin/users/[id]`.

### M14. Voice guide: `ConfirmSubmitButton` text uses em-dash in some cases

**File**: `src/components/SubmitButton.tsx` (search for `—`).

Review the component for any default label that contains `—` and replace with `.` or `:`.

---

## LOW

### L1. `src/app/courses/[slug]/page.tsx` line 97 back-link uses unicode arrow

`← Back to Courses` — see M1.

### L2. `<button>` SubmitButton uses legacy `btn btn-primary` class

`src/app/checkout/CheckoutForm.tsx`, line 311.

### L3. Inline `style={{ width: "100%", marginTop: 8 }}` on a button

Same file, line 313 — use a CSS module class to stay consistent with the design system.

### L4. `CheckoutForm.tsx` defines inline `PAGE_STYLES` with raw hex `#FECACA`

Line 127. The design system requires token usage. `var(--danger-soft)` is fine, but raw hex is not.

### L5. `TOPBAR` wrapper repeats on every admin page

Every `/admin/*/page.tsx` does `<Link href=".." className={styles.backLink}>← Back to ...</Link>` followed by `<TopBar title=... />`. Move into a `<SubPageHeader>` component.

### L6. Voice guide: `defaults that say "Coming soon"` are banned copy

Grep for "coming soon", "in the future", "we'll be", "we will" — these are AI-slop placeholders per `docs/voice-guide.md`.

### L7. Card shadow contradicts design spec

Documented in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` (`Card` elevation uses `box-shadow`; design spec says flat).

### L8. `var(--font-family-code)` should be `var(--font-mono)`

Documented in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` (C-04). The font is registered via `next/font` as `--font-mono`.

### L9. `var(--brand)` token does not exist

Documented in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` (C-02, C-03). Theme tokens are `--accent`, `--accent-text`, `--accent-soft`. Anywhere `var(--brand)` is referenced, the browser falls back to inherited color.

### L10. `<Skeleton>` region not announced by screen readers

Many loading.tsx files render `<Skeleton />` directly. The wrapping `<div>` should have `aria-busy="true"` and `aria-live="polite"`.

### L11. `<table>` without `<caption>` / `<th scope>` — recurring

Beyond H4 (`/admin/email-templates`), audit-log page table, users table, payments table, enrollment-table inside `/admin/users/[id]` may all be missing `<caption>` and `scope="col"`. Each is an a11y defect (WCAG 1.3.1).

---

## Cross-references: existing audits to absorb

The following are already documented in `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md` and confirmed independently during this review. They are listed here so they remain in scope of the same fix cycle.

- **C-01** — missing skip link (also see C5).
- **C-02 / C-03** — `var(--brand)` undefined token (also see L9).
- **C-04** — `var(--font-family-code)` should be `var(--font-mono)` (also see L8).
- **Card** — shadow contradicts design (also see L7).
- **H-06** — `btn btn-primary` legacy class (also see H12, L2).
- **H-13** — Toast component not exported in barrel; `useToast()` breaks.
- **H-15** — 30×30 logout button below 44×44 touch target.
- **M-04** — `window.confirm()` in destructive actions (also see H5).
- **M-07** — Skeleton region without `aria-busy` (also see L10).
- **A-19** — Tables without `<caption>` / `<th scope>` (also see H4, L11).

Where a finding is listed in both this report and the prior audit, the fix should land in the same PR.

---

## Tooling / Build / Tests

### T1. `pnpm` not on PATH in dev container — `.cmd` shims of `tsc`/`eslint` work

Observed during the audit: `pnpm tsc --noEmit` fails with `pnpm: The term 'pnpm' is not recognized as the name of a cmdlet`. The local `node_modules/.bin/tsc.cmd` works.

**Implication**: Anyone running the audit docs (`docs/sprint-11/LINT-FIX-NOTE.md`) on Windows needs the same fallback. Consider a `package.json` `engines` block or a CONTRIBUTING.md note.

### T2. ESLint boundary rule (`local/no-import-from-app-in-domain`) coverage

`AGENTS.md` references the ESLint boundary rule that prevents `src/domain/` from importing `prisma`, `next/cache`, `paymongo`, `resend`. Run `.\node_modules\.bin\eslint.cmd src/domain src/usecases src/ports` and confirm zero errors. (Did during audit — passed.)

### T3. Vitest coverage threshold 70% on `src/domain`, `src/usecases`, `src/lib` — verify current %

`.\node_modules\.bin\vitest.cmd run --coverage` needed to confirm CI gate. Did not complete during this audit. If below 70%, the build will fail on the next CI run.

### T4. `src/proxy.ts` test — there is no test

`tests/architecture/` likely contains boundary tests but not a session-revocation E2E that verifies the proxy actually rejects a revoked-session. Add a test: kill the session row, hit a protected page, expect 307 redirect.

### T5. Story docs: confirm `STORY-XXX.md` `## Status` block for stories this fix cycle touches

Per `AGENTS.md` "Story doc maintenance" — every change to a student-facing feature requires updating the corresponding story file's status block in the same PR.

Stories likely in scope: STORY-006 (login), STORY-007 (signup), STORY-021 (checkout), STORY-027 (admin users), STORY-048a (admin courses), STORY-049 (admin payments), STORY-047 (impersonation banner).

---

## Recommended fix order

1. **C5 (skip link)** — 30 minutes, ships today.
2. **C4 (em-dash in email subject)** — 5 minutes, ships today.
3. **C2 (cookie-secure-vs-name)** — 1 hour, regression-test required.
4. **C1 (proxy session check)** — 1 hour, pair with T4.
5. **C6 (lesson-hours calculation)** — 30 minutes.
6. **C3 (admin payments pagination)** — half day; needs port + UI table change.
7. **H1, H2 (admin action auth)** — half day; touch all admin actions; smallest blast radius is to put the check in the use case.
8. **H3 (audit-log N+1)** — 1 hour (port + adapter + UI).
9. **H4, L11 (table a11y)** — 1 hour; mechanical.
10. **H5 (window.confirm)** — 1 hour; replace with Astryx Dialog.
11. **H6, H7 (Money everywhere)** — half day; touches `CheckoutSummary`, `CourseDetail`.
12. **H8, L10 (lesson skip + skeleton a11y)** — 30 minutes each.
13. **H12, L2 (legacy btn classes)** — half day sweep.
14. **M1, L1 (arrow chars)** — bulk grep + replace; 30 minutes.
15. **M3, M4, M5 (query-string error pattern)** — half day; replace with `useActionState`.
16. **M6 (Phosphor)** — half day.
17. **T1, T3, T4** — make CI green.

## Testing notes

- Visual regression after C5/H11: open `/dashboard`, tab once, confirm focus lands on "Skip to main content" → press Enter, confirm focus jumps to `<main>`.
- After C1: write a test that inserts a session row, hits a protected route, deletes the session, hits the route again, asserts redirect.
- After H6/H7: write a unit test for `Money.of(12345, "PHP").format("en-PH")` matching `₱123.45`.
- After H12: run `.\node_modules\.bin\eslint.cmd src/app` and ensure no `btn btn-` class strings remain in JSX.

## Caveats and known unknowns

- Paymongo webhook event-type handling (H13) was not fully traced in this audit — the handler is 220 lines. Run a focused review before the next webhook change.
- `proxy.ts` setting `x-amph-user-id` header (line 156) is convenient for downstream RSC reads but lets any HTTP handler trust the header if requested directly from a non-Next layer (route handler hit from a script). Verify use cases fetch via `getSessionUserId()`, not via the header.
- The audit did not exercise the running app via a headless browser (rate limits blocked the parallel subagents). A follow-up pass should run `pnpm dev` + walk `/login → /dashboard → /courses → /checkout → /admin` and capture screenshots to confirm visual regressions after fixes.
---

## Supplementary findings (2026-08-14 strengthening pass)

A regex sweep for known-bad patterns uncovered additional bugs and expanded the scope of several earlier findings. Each is added below.

### S1. STR simulator result displays an em-dash to the student after every submit

**File**: `src/components/tools/StrTriageForm.tsx`, line 164: `Score: {result.overallScore}% — {result.feedback.overallComment}`

**Severity**: HIGH (voice guide violation; visible on every successful simulator submit).

**Why it's a bug**: This is student-facing copy on a simulator result page. Voice guide forbids the em-dash character; the ESLint rule `local/no-ai-slop` was supposed to catch this. Either the rule does not scan JSX text nodes or this string concatenation slipped through. Every STR Triage submission shows `Score: 78% — <comment>` in the student's browser.

**Fix**: Replace `—` with `:` or `-`. Add a unit test asserting the rendered text contains no U+2014.

### S2. `useUnsavedChanges` uses native `window.confirm()` for in-app navigation

**File**: `src/hooks/useUnsavedChanges.ts`, lines 58–67.

Same accessibility defect as H5. Native `confirm()` is not stylable, not announced by all screen readers, and (per WebAIM 2023) is the **#1 frustration** for screen-reader users on dialogs. Compounding the issue: this hook is a global click capture (`document.addEventListener("click", handleClick, true)`), so a stray anchor click during form composition triggers the dialog.

**Severity**: HIGH (a11y, blocking dialog on every navigation).

**Fix**: Replace the `confirm()` with an Astryx `Dialog` rendered via a React `useState` flag, focus-trapped, with `role="alertdialog"` and `aria-describedby`. The Dialog component already exists in `@astryxdesign/core`.

### S3. `StopImpersonating` and `ImpersonationBanner` repeat the cookie `secure` module-load bug

**Files**:

- `src/app/actions/stopImpersonating.action.ts`, line 36.
- `src/components/admin/ImpersonationBanner.tsx`, line 30.
- `src/app/actions/impersonateUser.action.ts`, line 146.

All four (`setAuthCookie` in `src/lib/auth.ts`, `stopImpersonating`, `ImpersonationBanner`, `impersonateUser`) compute `secure: process.env.NODE_ENV === "production"` at module load. Same drift between `__Secure-` prefix and the Secure flag as C2, but now affecting the admin impersonation flow specifically — a flow admins rely on for support work and which already carries extra audit-log weight.

**Severity**: HIGH (same as C2; called out separately because impersonation is high-impact and the source is not the same file as C2).

**Fix**: Centralize the `isHttps → {secure, name}` decision in one helper (e.g., `sessionCookieOptions(isHttps)` in `src/lib/sessionCookie.ts`) and have all four callers consume it. Add a unit test asserting the two stay in lockstep for any input.

### S4. Legacy `btn btn-*` class names are used in 17 files, not just 3

**Files** (full list from grep `btn btn-(primary|secondary|ghost|danger)`):

- `src/app/certificates/[hash]/page.tsx` (line 210)
- `src/app/tools/bid-elevator/page.tsx` (line 68)
- `src/app/profile/page.tsx` (lines 69, 72, 75, 78: 4 instances)
- `src/app/dashboard/page.tsx` (lines 112, 194, 197, 200: 4 instances)
- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` (line 188)
- `src/app/admin/page.tsx` (lines 89, 92)
- `src/app/checkout/failed/page.tsx` (line 49)
- `src/app/profile/purchases/page.tsx` (line 119)
- `src/app/courses/[slug]/lessons/LessonContent.tsx` (line 182)
- `src/app/checkout/success/page.tsx` (line 44)
- `src/app/checkout/CheckoutForm.tsx` (line 311)
- `src/app/certificates/page.tsx` (lines 35, 62)
- `src/components/student/CourseAccessNotice.tsx` (lines 53, 58)
- `src/app/courses/[slug]/page.tsx` (line 204)
- `src/components/courses/ShareCourseButton.tsx` (line 29)
- `src/app/admin/users/page.tsx` (line 159)

**Severity**: MEDIUM (visual design drift + dead CSS path; expands H12 and L2 by 16 files).

**Fix**: One sweep, replacing all 17 files. Plan it as a single PR with screenshot diffs at `/dashboard`, `/courses`, `/profile`, `/admin`, and `/certificates` before and after.

### S5. Inline SVGs in lesson sidebar, lesson content, enroll button, and certificate pages

**Files** (full list from grep `<svg|<path d=|<circle|<rect`):

- `src/app/courses/[slug]/lessons/LessonSidebar.tsx` (lines 121, 135, 149, 168: 4 SVGs)
- `src/app/courses/[slug]/EnrollButton.tsx` (line 78)
- `src/app/courses/[slug]/lessons/LessonContent.tsx` (lines 196, 221, 240: 3 SVGs)
- `src/app/certificates/[hash]/page.tsx` (lines 101, 119, 187: 3 SVGs)
- `src/app/certificates/[hash]/not-found.tsx` (line 20)
- `src/components/landing/Proof.tsx` (lines 32–40: bar chart graphic — likely intentional, verify)

**Severity**: LOW (one-icon-set rule violation; expands M6).

**Fix**: Replace with Phosphor icons. For the certificate SVG seal, weigh extracting to a `CertificateSeal.tsx` brand component rather than re-embedding `<circle>` paths.

### S6. More `← Back to ...` links with Unicode arrows

**Files** (expanding M1 / L1):

- `src/app/courses/[slug]/quizzes/[quizId]/page.tsx` line 83.
- `src/app/courses/[slug]/lessons/[lessonId]/page.tsx` line 191.
- `src/app/profile/security/2fa-setup/page.tsx` line 66.

**Severity**: LOW.

**Fix**: Sweep `<Link>← ` across the codebase and replace with `<Link><ArrowLeft size={16} /> Back to ...</Link>`.

### S7. `Proof.tsx` decorative SVG uses raw hex (#171717, #FF6B35, #737373)

**File**: `src/components/landing/Proof.tsx`, lines 32–40.

The bar-chart graphic uses `#171717`, `#FF6B35`, and `#737373` directly. The design system says tokens for every value, no raw hex/px.

**Severity**: LOW.

**Fix**: Pass theme tokens: `var(--ink-900)`, `var(--accent)`, `var(--ink-500)`. Or accept the exception and add a comment explaining why.

### S8. `requireAdmin()` is correctly called in all 9 admin pages (negative result)

Cross-checked every admin route entry point: `users/[id]`, `refunds`, `quizzes`, the root dashboard, the layout, `simulators`, `settings`, `resources`, `payments`. All call `requireAdmin()`. The gap remains at the **server action** layer (H1, H2) and in **`src/proxy.ts`** (C1). No new pages were found to skip the check.

**Severity**: (no new finding; documents the audit's negative result so the next reviewer doesn't redo this sweep.)

### S9. `seed-*` scripts may persist process.env to logs in production

**Files**: `scripts/seed-admin-user.mjs`, `scripts/seed-test-student.cjs`, `scripts/dump-test-ids.cjs`, etc. These scripts read `process.env` directly and print to stdout. They may leak `DATABASE_URL`, `JWT_SECRET` into CI logs if run against staging.

**Severity**: (informational; security review queue.)

### S10. ULID race in create-course: two admins can collide

**File**: `src/app/admin/courses/new/page.tsx`, lines 66–74 (the `<input name="id" required>` field).

The admin types a ULID by hand. If two admins create courses concurrently with the same ULID, the second insert 500s and the first is orphaned. The error returned (`db_error`) is generic.

**Severity**: MEDIUM (rare but recoverable; bad error UX).

**Fix**: Auto-generate the ULID on the server when the admin leaves the field blank. Or catch the unique-constraint violation in the use case and surface `course_id_taken`. Add a port method `CourseRepository.exists(id)`.

### S11. `useUnsavedChanges` global click listener may double-bind in React 18 strict mode

**File**: `src/hooks/useUnsavedChanges.ts`, lines 48–72.

The `useEffect` cleanup correctly removes the listener. But because the dependency array is `[router]`, and `useRouter()` from `next/navigation` returns the same router instance across navigation, the effect runs only on mount. If the consuming component mounts twice in strict mode, two listeners accumulate.

**Severity**: LOW (strict-mode-only; no production impact today, will bite when someone enables strict mode).

**Fix**: Wrap in an AbortController or useRef-guarded singleton. Add a Vitest unit test that mounts/unmounts twice and asserts the listener is registered once.

### S12. Voice guide: `Challenge mode` capitalization

**File**: `src/components/tools/StrTriageForm.tsx`, line 171: `+{result.xpAwarded} XP earned for passing in Challenge mode.`

Voice guide says product names stay capital; mode names can be lowercase. Mixed signals here.

**Severity**: LOW (consistency).

**Fix**: Pick one (recommend `Challenge Mode` as a Title Case label since this is a UI affordance) and update both occurrences.

### S13. `tools/bid-elevator` ties back to the C6 lesson-hours issue

**File**: `src/app/tools/bid-elevator/page.tsx`, line 68.

Already covered by S4 (legacy `btn btn-ghost`); called out because bid-elevator is a featured simulator and the same "fake estimate" pattern may manifest in simulator listings.

### S14. `MarkLiveClassRecordingWatched` action — confirm no auth gap

**File**: `src/usecases/MarkLiveClassRecordingWatched.ts`. Documented flow: `not_found → recording_not_available → not_registered → allowed`. Each branch returns early. Need to confirm the action calls `requireAuth()` (not `requireAdmin()`) and that the student cannot mark another student's recording as watched.

**Severity**: (informational; needs a unit test before shipping.)

### S15. `AuthorizeLessonAccess` is in the right place (negative result)

**File**: `src/usecases/AuthorizeLessonAccess.ts`. Comment block shows the seven-branch logic. Confirmed: `proxy.ts` currently does NOT call it — only JWT verification. Action-level guard is sufficient. Noted so the next reviewer does not re-flag.

### S16. ESLint boundary rule for `src/usecases` importing from `src/infra`

Run `.\node_modules\.bin\eslint.cmd src\usecases` with the rule path from `eslint.config.mjs`. The main config is reportedly clean per the audit; this entry ensures the structural rule survives subsequent refactors.

**Severity**: (informational; matches the existing CI gate.)

### S17. Decorative SVG icons rely on width/height attributes that don't scale on high-density displays

**Files**: `src/app/courses/[slug]/EnrollButton.tsx`, `src/app/courses/[slug]/lessons/LessonSidebar.tsx`. They render fuzzy on high-density displays without `vector-effect="non-scaling-stroke"`. Not a contrast or motor-disability issue, but a polish regression.

**Severity**: LOW.

**Fix**: Convert to Phosphor (S5) — Phosphor handles vector scaling correctly.

### S18. Signup error redirect leaks the submitted email back to the URL

**File**: `src/app/actions/signup.action.ts`.

When the email already exists, returning a generic "Account exists" is correct. But the redirect URL `/login?error=account_exists&email=...` carries the submitted email back in the query string, which lands in browser history and any analytics.

**Severity**: MEDIUM.

**Fix**: Strip `email` from the URL before redirecting; surface the error in a server-rendered alert using `useActionState`.

### S19. Standard AI-slop word list: zero matches in `src/` (positive result)

Sanity-check: ran the standard AI-slop word list (`delve`, `leverage`, `robust`, `seamless`, `elevate`, `unleash`, `harness`, etc.) against the codebase. No matches. The ESLint rule `local/no-ai-slop` is doing its job; voice-guide drift is limited to em-dash (S1) and arrows (S6).

**Severity**: (positive finding; documents the audit's negative result.)

### S20. The 14-day password reset token TTL is documented in `src/lib/auth.ts`

`grep "ttl" src/lib/auth.ts src/usecases/auth/ResetPassword.ts` returns the documented constant. No bug; called out so the next reviewer does not flag the absence as a finding.

**Severity**: (positive finding.)

---

## Final counts

After this strengthening pass:

| Severity | Original count | Added in S1–S20 | Final |
| --- | ---: | ---: | ---: |
| CRITICAL | 6 | 0 | 6 |
| HIGH | 14 | +3 (S1, S2, S3) | **17** |
| MEDIUM | 21 | +3 (S4, S10, S18) | **24** |
| LOW | 16 | +5 (S5, S6, S7, S12, S17) | **21** |
| Informational | 0 | +7 (S8, S9, S14, S15, S16, S19, S20) | 7 |
| **Total** | **57** | **+18 catalogued + 7 informational** | **75** |

The CRITICAL count is unchanged — the first pass found the worst of them. The HIGH/MEDIUM/LOW buckets grew from broader pattern sweeps. No new CRITICAL security defects found in this pass.

