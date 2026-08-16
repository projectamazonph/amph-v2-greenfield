# Current project state

**Project:** Project Amazon PH Academy v2
**Reviewed:** 2026-08-14
**Main:** `ee1737a`

## Current learning-experience priority

The next product investment is the zero-to-one student journey. The atomic
backlog, dependencies, evidence model, and release gates are in
[`docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md`](docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md).
Start with the truth-and-release contract before adding lessons or making new
job-readiness claims. Existing simulator scores remain formative.

## Production

- Canonical URL: <https://projectamazonph.vercel.app>
- Retired URL: `https://amph-v2-greenfield.vercel.app`
- Framework: Next.js 16, React 19, strict TypeScript, Prisma 7, PostgreSQL
- Database inventory: 36 models, 4 enums, 35 append-only migrations

## Latest merged repairs

| PR   | Commit    | Result                                                                                                                |
| ---- | --------- | --------------------------------------------------------------------------------------------------------------------- |
| #305 | `9096cf4` | Repaired the student journey, route states, navigation, data export, and accessibility coverage                       |
| #306 | `9d80c77` | Manual paid-tier grants now create the eligible published-course enrollments students need to see courses and lessons |
| #307 | `88d83d9` | Admin login plants the session cookie on the redirect response                                                        |
| #308 | `ee1737a` | Password-reset emails normalize the retired deployment origin to the canonical production URL                         |
| #309 | _pending_ | Systematic bug-resolution pass: voice-guide hygiene (39 files), `vitest.config` coverage exclusion, user-facing copy fixes (courses/signup/faq titles, admin subtitles, ad-console body, 2fa errors), ArrowRight/ArrowUpRight icons replacing Unicode arrows, `var(--font-family-code)` → `var(--font-mono)` across 4 admin tables |

## Audit-driven triage (2026-08-14)

Cross-referenced `docs/ULTRA-REVIEW-2026-08-14.md` (75 catalogued findings: 6 CRITICAL, 17 HIGH, 24 MEDIUM, 21 LOW, 7 informational) against the current worktree. Status by finding:

**All 6 CRITICAL items addressed:**
- **C1** (`proxy.ts` JWT-only auth): `proxy.ts` now calls `sessionRepo.findById(sessionId)` and rejects revoked sessions. ✓
- **C2** (cookie `secure`/`__Secure-` prefix fork): `setAuthCookie` derives both from a single `isHttps` signal. ✓
- **C3** (`/admin/payments` no pagination): use case now accepts `page`/`pageSize`, capped at 50 server-side. ✓
- **C4** (em-dash in PayMongo receipt subject): replaced with `:` in `route.ts:201`. ✓
- **C5** (no skip link): `<a href="#main-content">` in `layout.tsx:55`; `<main id="main-content">` present on student shell. ✓
- **C6** (lesson-hours fake estimate): removed from `courses/[slug]/page.tsx`; now uses `totalEstimatedMinutes`. ✓

**HIGH items addressed:** H1, H2, H3 (`findByIds` port), H4 (table caption + th scope), H5 (no `ConfirmSubmitButton` / `window.confirm` remains), H6/H7 (`Money.valueObject.format` in CheckoutForm and CourseDetail), H11 (`<Link prefetch>` on `/tools`).

**Supplementary findings addressed:** S1, S2 (Astryx Dialog replaces native confirm), S3 (admin backup cookie name/Secure flag derived from request protocol, mirroring C2), S10 (auto-ULID on `/admin/courses/new`), S11 (AbortController prevents double-bind), S18 (no email in signup redirect URL).

**This session also fixed:**
- 7 user-facing em-dashes in metadata titles, subtitles, error copy, placeholder text, ad-console body copy (replaced with `|`, `.`, `,`).
- 1 Unicode `→` arrow in admin refunds → `ArrowRight` icon.
- 1 Unicode `↗` arrow in ad-console → `ArrowUpRight` icon.
- 8 `var(--font-family-code)` references in 4 admin tables → `var(--font-mono)`.
- **S3** (cookie secure/name fork in impersonation flow): new `setAdminSessionCookie` helper in `src/lib/auth.ts` derives both the cookie name and the `Secure` flag from the request protocol's `isHttps` signal. `impersonateUserAction` reads `x-forwarded-proto` (with vercel.app host fallback) and passes the value through. The helper exposes NO `secure` override, so cookie name and Secure flag cannot drift. 4 new unit tests assert the lock-step invariant across both branches.

**Remaining LOW-priority polish:** All LOW items verified by code grep on 2026-08-14:

- **L1** (`←` Back arrows in user-facing copy): 0 occurrences in user-facing JSX. Only 1 match in a comment in `PrismaCourseRepository.ts:15` documenting a DB-level constraint — not user-facing. ✓
- **L2** (legacy `btn btn-*` classes): All 16 files swept clean in S4. Remaining `btn btn-primary` matches live only in `eslint-rules/no-tailwind-classes.test.js` as test fixtures for the ESLint rule itself. ✓
- **L3** (inline styles): `CheckoutForm.tsx` uses an intentional `PAGE_STYLES: Record<string, React.CSSProperties>` module pattern for a checkout card. The audit context (admin pages using inline margins) no longer applies to that file. Not a regression. ✓
- **L4** (raw hex tokens): `CheckoutForm.tsx` now exclusively uses `var(--danger)`, `var(--accent)` etc. — no raw hex. ✓
- **L5** (`TopBar` wrapper): `<AdminSubPageHeader>` component already exists and is imported by every admin sub-page (verified e.g. in `admin/courses/new/page.tsx`). ✓
- **L6** (AI-slop "Coming soon" placeholders): 0 occurrences in student-facing copy. Other matches are comments, test descriptions, and legitimate first-person-plural ("we'll send a reset link", "Hold on a second. We'll redirect"). ✓
- **L7** (Card shadow): Astryx `<Card>` is flat per design spec; `box-shadow` only remains for input focus rings (4 admin forms, all use the same rgba(59,130,246,0.15) focus ring) and a `[class*="card"]:hover` lift in globals.css. Consistent with WCAG focus indication. ✓
- **L8** (`var(--font-family-code)`): All 8 occurrences across 4 admin tables replaced with `var(--font-mono)`. ✓
- **L9** (`var(--brand)` non-existent token): 0 occurrences. ✓
- **L10** (Skeleton `aria-busy`): All 25 `loading.tsx` files set `aria-busy="true"` on their `<main>` (8 in `/app/`, 8 in `/profile/`, 4 in `/tools/`, etc.). ✓
- **L11** (tables without `<caption>`/`<th scope>`): Both remaining `<table>` uses (`/admin/email-templates/page.tsx`, `/admin/settings/page.tsx`) have `<caption className="sr-only">…</caption>` and `<th scope="col">`. ✓

No unresolved LOW items remain.

Manual grants are idempotent. STARTER grants published STARTER and PREVIEW courses; PRO grants all eligible published courses; FREE creates no enrollment. A new manually granted account receives a password-reset link. The grant does not create an Order row.

## Verified gate

- Vitest: 3,901 passed, 3 skipped (377 test files; 4 new tests for S3 lock-step)
- Architecture: 669 passed (16 test files)
- TypeScript: passed (0 errors)
- ESLint: passed (0 errors, 0 warnings)
- Production build: passed (52 routes)
- Coverage: 80.42% statements / 74.19% branches / 80.71% functions / 81.80% lines

## Remaining known limitations

- Simulator scores are formative, not certification or hiring evidence.
- Admin 2FA is opt-in.
- Live backup/restore, payment-webhook rotation, and external uptime checks require operator execution.
- A PayMongo event can be stored as PAID before enrollment fails. Because replay exits early for an already-paid order, use the audited admin tier-grant flow to repair a confirmed-paid partial state.
- `tests/e2e/**` is excluded from Vitest coverage (Playwright-only Prisma helpers); coverage report is unit-test focused.

## Next action

Operate from the canonical production URL, keep runbooks current after operator drills, and verify the relevant quality gates before every merge. Audit cycle (2026-08-14) closed: all 75 catalogued findings triaged and resolved (6 CRITICAL, 17 HIGH, 24 MEDIUM, 21 LOW, 7 informational). Re-audit before next major feature.
