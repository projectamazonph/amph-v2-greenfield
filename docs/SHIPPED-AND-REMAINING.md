# Ship Record and Open Recommendations — 2026-09-12

**Repository:** `amph-v2-greenfield`
**Head:** `7617fe8` — `docs: mark P3-85 csv export as implemented (36/40) (#498)`
**Branch:** `main`

This document is the single source of truth for what shipped recently and where every audit recommendation currently stands. It replaces the scattered "updates since" sections in each audit doc with one place to check.

---

## 1. Recently shipped features (PRs #471–#498)

This stretch delivered the CSV export feature (P3-85), closed the PR-C/PR-D feature set, and refreshed multiple audit-doc status sections. Every check is green.

### PR #497 / #498 — CSV export for payments (P3-85)

The headline ship of this stretch. Admin users can now export filtered payment data to a streaming CSV file.

**Files added:**

| File                                                    | Role                                                                                                                                                                                                                 |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/export-csv.ts`                                 | RFC 4180 CSV utility: `escapeField` wraps strings in double quotes, doubles embedded quotes, joins with commas, terminates rows with CRLF.                                                                           |
| `src/usecases/ExportPayments.ts`                        | Use case: paginates through `IOrderRepository.listPaginated` (batch 50, max 10,000), batch-fetches buyer emails from `UserRepository`, returns typed `ExportPaymentRow[]`.                                           |
| `src/app/admin/payments/export/route.ts`                | Admin-gated streaming route: validates JWT + admin role, reads optional `status` filter, calls `ExportPayments`, streams CSV via `ReadableStream` with `Content-Disposition: attachment`. Uses `runtime = "nodejs"`. |
| `src/app/admin/payments/export/__tests__/route.test.ts` | Route integration test.                                                                                                                                                                                              |
| `src/usecases/__tests__/ExportPayments.test.ts`         | Use-case test.                                                                                                                                                                                                       |
| `src/lib/__tests__/export-csv.test.ts`                  | Unit tests for the CSV utility.                                                                                                                                                                                      |

**How it works:**

1. Admin clicks "Export CSV" on the payments list page (`admin/payments/page.tsx`).
2. Browser navigates to `GET /admin/payments/export?status=PAID` (or other filter).
3. Route validates the session via `getSessionUserId()`, looks up the user in the DB, and rejects 401/403 for non-admins.
4. Calls `container.exportPayments.execute({ status })` which paginates through orders, batch-fetches users, maps to `ExportPaymentRow` (id, userEmail, courseId, totalFormatted, status, createdAt).
5. Builds CSV with `toCSV()` and streams via `ReadableStream` to avoid OOM on large exports.
6. Response: `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="payments-YYYY-MM-DD.csv"`.

**Pre-existing context:** `ExportAuditLogs` use case and `/admin/audit-log/export` route (STORY-061) were already in the codebase. P3-85 extended the same export pattern to the payments table.

**Test coverage:** export-csv unit tests (20 tests), ExportPayments use-case test (3 scenarios), route integration test (4 checks). One ordering flake in `ExportPayments.test.ts` was fixed in PR #498 before merge.

### Other PRs merged this stretch (chronological)

| PR        | Commit  | Title                                                                       | Story / scope                                                    |
| --------- | ------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| #471      | 5709bc7 | feat(learning): add module five weekly client readouts (STORY-128)          | STORY-128 — Module 5 client readout lessons 5.1–5.3              |
| #473      | ad139f3 | docs: record production download-center seed (STORY-099)                    | STORY-099 — production seed metadata doc                         |
| #477      | 3889817 | fix(db): add audit fields to all 29 models (#474)                           | Architecture audit P1: `deletedAt`, `createdById`, `updatedById` |
| #478      | aa78b09 | fix(ui): overlaps, padding, fluidity and back-navigation gaps (#476)        | UI audit fixes                                                   |
| #479      | 4ea2c64 | fix(ui): same padding and table-layout on detail + simulator tables         | UI polish                                                        |
| #482      | 05f4181 | fix(e2e): seed 2FA admin and submit TOTP in admin journeys                  | E2E TOTP login                                                   |
| #483      | 628eae4 | docs: changelog entries for 478, 482, STORY-055                             | CHANGELOG sync                                                   |
| #484      | 31221dd | docs(curriculum): sync content metadata and validator paths                 | Curriculum metadata                                              |
| #485      | 9d0e48e | P4 PR-A — schema (W0-01) + maintenance mode (P1-08) + announcements (P1-07) | P1-07 maintenance mode, W0-01 settings table                     |
| #486/#487 | cd41fad | P4 PR-B — PayMongo installments (P0-01) + BIR invoicing (P0-02)             | Installments + BIR invoicing                                     |
| #488      | 288ea41 | docs: close out P4 PR-B merged state and #486                               | PR-B docs                                                        |
| #489      | 61f61e7 | feat(prerequisites): course gates (P1-01)                                   | DB-backed course prerequisites                                   |
| #490      | ec5b383 | feat(assignments): instructor-assigned work (P1-02)                         | Assignment model + submit/grade flow                             |
| #491      | ae78783 | feat(settings): admin-editable site settings (P1-05)                        | `Setting` model key/value store                                  |
| #492      | 48a0d19 | docs: verify P1-06 email templates already shipped                          | P1-06 email templates exist                                      |
| #493      | 85cf5aa | feat(resources): brand all workbooks and handouts (P1-03)                   | `brand-downloads.py` branding                                    |
| #494      | 4ac9b7d | feat(oauth): Google sign-in (P1-04)                                         | Hand-rolled OAuth2 + PKCE                                        |
| #495      | f7d103c | fix(auth): restore opt-in admin 2FA (#448)                                  | Remove page-level enforcement gate                               |
| #496      | f69c01d | docs: mark PR-C, PR-D, STORY-086 as implemented                             | P3 progress fix                                                  |
| #497      | d760174 | feat(admin): csv export for payments (P3-85)                                | CSV export feature                                               |
| #498      | 7617fe8 | docs: mark P3-85 csv export as implemented (36/40)                          | Docs close-out                                                   |

### CI gate status (on merged PRs #497 + #498)

All 10 checks passed green:

| Check                   | Result |
| ----------------------- | ------ |
| Architecture compliance | Pass   |
| Build                   | Pass   |
| ESLint                  | Pass   |
| E2E (Playwright)        | Pass   |
| Lighthouse CI           | Pass   |
| Typecheck + Lint        | Pass   |
| Unit + Integration      | Pass   |
| Vercel deployment       | Pass   |
| Vercel Preview Comments | Pass   |
| CodeRabbit              | Pass   |

---

## 2. Audit recommendation status

Five audit docs exist in `docs/`. This section records the current status of every recommendation in each.

### 2.1 Architecture compliance audit — 2026-09-06

**Source:** `docs/audit-2026-09-06-architecture-compliance-review.md`

Reviewed commit `5709bc7` (PR #471) against AGENTS.md rules. Three findings were logged; the recommended follow-up order is now resolved.

| #   | Finding                                        | Severity | Status         | Evidence                                                                                                                                                   |
| --- | ---------------------------------------------- | -------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Database audit fields missing on 29/37 models  | P1       | **FIXED**      | PR #477 (`3889817`). Migration `20260906000000_add_audit_fields_to_all_models` adds `deletedAt`, `createdById`, `updatedById`.                             |
| 2   | Six ports' InMemory adapters missing           | P1       | **NOT NEEDED** | Adapters exist in `src/infra/live-class/`, `src/infra/simulator/`, `src/infra/payment/`, `src/infra/db/inmemory/` — all wired into `buildTestContainer()`. |
| 3   | User model missing `createdById`/`updatedById` | P2       | **FIXED**      | PR #477 (same migration as #1).                                                                                                                            |

**Recommended follow-up order:**

1. Add audit fields to all mutable models. -- **FIXED** -- PR #477.
2. Create six missing InMemory adapters. -- **NOT NEEDED** -- existing.
3. Add `createdById`/`updatedById` to User model. -- **FIXED** -- PR #477.
4. Run typecheck/lint/test in CI to confirm green. -- **VERIFIED** -- see CI table in Section 1.

**What is working well:** Zero `console.log`/`throw`/`@ts-expect-error` in production source. Consistent `Result<T,E>`. `Money` value object. 5 simulators via registry. Formative-only labeling (STORY-078). Custom ESLint rules. 92.7% use-case test ratio (114/123). 96.3% loading skeleton coverage.

### 2.2 Completeness audit — 2026-07-27

**Source:** `docs/audit-2026-07-27-completeness-review.md`

Reviewed commit `5b8072b` against a 12-point completeness checklist. Ten "updates since" items recorded as fixed — all remain resolved. Two checklist observations remain open.

**Updates since 2026-07-27 audit (all FIXED):**

1. PrismaBadgeRepository create/update/archive fully implemented.
2. `seed-admin-user.mjs` uses shared Prisma adapter path.
3. Health endpoint DB readiness probe — `src/app/api/health/route.ts`.
4. Simulator attempts use authenticated user — `getSessionUserId()` replaces `"system"`.
5. Dashboard pending refunds is a live query — `GetAdminDashboardStats.pendingRefunds`.
6. Session revocation + impersonation restore — `sessions` table lookup in; admin token backup/restore.
7. Quiz lesson placeholder closed — routes to dedicated quiz page (STORY-094).
8. PayMongo refunds are real — `PayMongoAdapter.refund()` calls Refunds API.
9. `next build` no longer requires `DATABASE_URL` — lazy `Proxy` for Prisma client.
10. Partial: student 2FA, account deletion/export, formative-only labeling shipped (STORY-095/096/097/078).

**Recommended follow-up status:**

1. Wire authenticated user into graded simulator actions. -- **FIXED**.
2. Implement Prisma badge mutations. -- **FIXED**.
3. `seed-admin-user.mjs` + smoke test. -- **FIXED**.
4. Session revocation model + account lockout. -- **PARTIALLY FIXED**: `sessions` lookup in; `lockedUntil` enforcement still NOT wired.
5. Impersonation backup handling. -- **FIXED** (backup/restore only; browser click-through not verified).
6. Dashboard refund placeholder. -- **FIXED**.
7. Quiz lesson to quiz route. -- **FIXED** (STORY-094).
8. Migration contract test on POSIX CI + Playwright browsers. -- **OPEN**.
9. Keep docs matrix updated on story changes. -- **ONGOING**.

### 2.3 Hardening review — 2026-07-26

**Source:** `docs/audit-2026-07-26-hardening-review.md`

Verified 8 claims from an external review against actual source. Most were already fixed or false. Two real gaps found; both addressed.

| Claim                                        | Status       | Evidence                                                                                                 |
| -------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------- |
| PayMongo webhook uses in-memory repos        | False        | Routes use `buildContainer()` + `container.orderRepo`; HMAC + idempotency in place.                      |
| In-memory repos wired in production          | False        | `buildProductionContainer()` wires `PrismaCourseRepository` + `PrismaOrderRepository`.                   |
| No admin panel exists                        | False        | `src/app/admin/` covers 10 sections.                                                                     |
| AuditLog never written                       | Mostly false | ~30 use cases write audit entries. One TODO: `SignUp.ts` (STORY-009).                                    |
| `src/lib/` and `src/components/` don't exist | False        | Both exist and active.                                                                                   |
| No `content/curriculum/` or import script    | False        | All present and in use.                                                                                  |
| Only one migration, DB not provisioned       | False        | 20 migrations; Neon Postgres provisioned.                                                                |
| Remove legacy User fields                    | Do not       | `enrolledCourseIds` read by `EnrollStudent`/`TierAccessPolicy`; `subscriptionTier` drives access policy. |

**Two gaps found during hardening pass (both addressed):**

1. **Session/account revocation non-functional** -- `getSessionUserId()` never queried `sessions` table, never read `lockedUntil`. **Status: PARTIALLY FIXED.** Server-side `sessions` lookup now in. `lockedUntil` enforcement and `failedLoginCount` increment still NOT wired (see Section 3.1).
2. **`pnpm db:seed:admin` broken** -- `package.json` pointed to nonexistent script. **Status: FIXED.** Script at `scripts/seed-admin-user.mjs` (commit `f13963b`), uses shared adapter path.

### 2.4 UI & Accessibility audit — 2026-08-14

**Source:** `docs/UI-ACCESSIBILITY-AUDIT-2026-08-14.md`

**All 9 Critical findings (C-01 through C-09) CLOSED:**

| Finding                                             | WCAG                     | Closed by         | Commit               |
| --------------------------------------------------- | ------------------------ | ----------------- | -------------------- |
| C-01 Skip-link in root layout                       | 2.4.1                    | PR #316           | `6c61fc3`            |
| C-02 QuizEditor shared aria-label on radios         | 1.3.1 / 4.1.2            | PR #324           | `5419ea1`            |
| C-03 QuizEditor missing `<label>`                   | 3.3.2 / 4.1.2            | PR #379           | `ba92d5a`            |
| C-04 CampaignBuilderForm uses placeholders          | 3.3.2 / 4.1.2            | PR #334           | `ae5c1be`            |
| C-05 UserCard 30x30 logout button                   | 2.5.5                    | PR #324           | `5419ea1`            |
| C-06 ConfirmSubmitButton uses `window.confirm`      | 2.1.1 / 4.1.2            | PR #316           | `6c61fc3`            |
| C-07 Skeleton variants lack `aria-busy`             | 4.1.3                    | PR #324 + PR #328 | `5419ea1`, `0c5df08` |
| C-08 Data tables lack captions + scope              | 1.3.1                    | PR #380           | `c1e1870`            |
| C-09 `var(--brand)` falls through to `currentColor` | Design system regression | PR #257           | `f135a84`            |

Contract pin tests added (round 32): `QuizEditor-r32-radios-unique-label.test.ts`, `UserCard-r32-touch-target.test.ts`, `ConfirmSubmitButton-r32-dialog.test.ts`, `Skeleton-r32-aria-busy.test.ts`.

**Cross-cutting recommendations (all OPEN — see Section 3.2):**

1. Token lint: Stylelint rule for unknown `var(--…)` references.
2. Token rename audit: script to diff `var(--…)` usage against theme definitions.
3. Component contract: `displayName` + `forwardRef` + JSDoc on UI primitives.
4. Form pattern: standardize on `Input` component in QuizEditor + CampaignBuilderForm.
5. Voice guide CI check: em-dash / emoji / banned-phrase regex.
6. Skip link + `<main id>`: wire `href="#main"`.
7. Touch target sweep: grep 20-40px widths, audit 44x44.

### 2.5 Simulator accuracy review — 2026-07-26

**Source:** `docs/audit-2026-07-26-simulator-accuracy-review.md`

This audit "holds up" -- every substantive claim was accurate. Three sequenced remediation phases defined. Phase 0 shipped; Phase 1 needs domain expertise; Phase 2 partially done.

**Verified findings (all confirmed in source):**

- Every simulator hands out free `explanation: 100` (hardcoded in all 4 simulators).
- Score policies weight that free dimension 10–25% (in `seed-simulator-policies.ts`).
- Listing Audit dimensions mislabeled: `dataSufficiency` is completion, `profitability` is severity-weighted coverage.
- Ground truth is crudely binary: `return severity === "info" ? "skip" : "fix"`.

**Three undocumented findings (more serious than review reported):**

1. Explanation field omission is inconsistent -- creates a scoring bug (double-counting).
2. Dimension mislabeling incomplete -- only Listing Audit audited; same pattern may exist elsewhere.
3. Ground truth bypass exploitable -- learner could pass Listing Audit by marking every finding "fix".

**Phase 0 -- Scoring integrity (STORY-071 through STORY-078): ALL DONE**

| Story     | Title                                          | Sprint    | Status             |
| --------- | ---------------------------------------------- | --------- | ------------------ |
| STORY-071 | Remove `explanation: 100` free dimension       | Sprint 14 | Shipped            |
| STORY-072 | Make `explanation` dimension opt-in per policy | Sprint 14 | Done               |
| STORY-073 | Normalize dimension scoring weights            | Sprint 14 | Done               |
| STORY-074 | Fix double-counting bug from omission          | Sprint 14 | Done               |
| STORY-075 | Rename mislabeled Listing Audit dimensions     | Sprint 14 | Done               |
| STORY-076 | Guard `explanation` on practice vs credential  | Sprint 14 | Done               |
| STORY-077 | Add dimension-coverage tests                   | Sprint 14 | Done               |
| STORY-078 | Mark all simulator results formative           | Sprint 14 | Shipped 2026-08-02 |

**Phase 1 -- Subject-matter accuracy (STORY-079 through STORY-084): ALL OPEN -- needs Ryan's PPC expertise**

Do NOT assign to an agent. These require Amazon PPC domain input.

| Story     | Title                                                     | Status |
| --------- | --------------------------------------------------------- | ------ |
| STORY-079 | Rewrite Bid Elevator economic model                       | OPEN   |
| STORY-080 | Replace length-based listing scoring with real rubric     | OPEN   |
| STORY-081 | Replace hardcoded keyword volumes with versioned datasets | OPEN   |
| STORY-082 | Expand STR Triage: click thresholds, relevance, etc.      | OPEN   |
| STORY-083 | Non-binary Listing Audit ground truth                     | OPEN   |
| STORY-084 | Campaign Builder strategic scoring                        | OPEN   |

**Phase 2 -- Assessment platform maturity (STORY-085 through STORY-089):**

| Story     | Title                                               | Status                                 |
| --------- | --------------------------------------------------- | -------------------------------------- |
| STORY-085 | Scenario publishing + versioning                    | DONE (Sprint 16)                       |
| STORY-086 | Instructor calibration and acceptable-answer ranges | DONE (Sprint 16)                       |
| STORY-087 | Explicit business-impact feedback                   | DONE (Sprint 16)                       |
| STORY-088 | Challenge progression                               | DONE (Sprint 16)                       |
| STORY-089 | Connected-account simulator                         | PLANNED (Sprint 16) -- not yet started |

**Bottom line:** Phase 0 closes scoring-integrity defects but does NOT make Listing Audit results trustworthy. Bypass survives until STORY-080 + STORY-083 land. STORY-078 keeps results away from credential/hiring signals until then.

---

## 3. Consolidated open items

### 3.1 Security + auth gaps

| # | Item | Audit source | Priority |
| --- | --- | --- | --- | --- |
| 1 | Enforce `lockedUntil` / `failedLoginCount` on login + every request | Harden #2; Completeness #4 | P1 |
| 2 | `SignUp.ts` audit entry (TODO STORY-009) | Harden review | P2 |
| 3 | Account deletion/export for students | Completeness #10 | P2 |

### 3.2 UI / accessibility cross-cutting

| #   | Item                                                         | Priority |
| --- | ------------------------------------------------------------ | -------- |
| 1   | Token lint: Stylelint rule for unknown `var(--…)` references | P2       |
| 2   | Token rename audit: script to diff usage against theme       | P2       |
| 3   | Component contract: `displayName` + `forwardRef` + JSDoc     | P3       |
| 4   | Form pattern: standardize on `Input` component               | P3       |
| 5   | Voice guide CI check: em-dash / emoji / banned-phrase regex  | P2       |
| 6   | Skip link + `<main id>`: wire `href="#main"`                 | Low      |
| 7   | Touch target sweep: grep 20-40px widths, audit 44x44         | Low      |

### 3.3 Documentation staleness

Called out in Completeness audit §Documentation changes.

| # | Doc | Issue | Priority |
| --- | --- | --- | --- | --- |
| 1 | `FEATURES.md` | "Last reviewed" date stale; describes unshipped as complete | P3 |
| 2 | `docs/sprint-plan.md` | Sprint 13 stories 061–063 still planned; Sprint 17 not planned | P2 |
| 3 | `docs/api-reference.md` | Contains non-existent routes; presented as current | P2 |
| 4 | `docs/db-schema.md` | Lists non-existent models/fields; schema is 34 models / 20 migrations | P2 |
| 5 | `docs/architecture/01-03-*.md` | Describe admin panel as planned; claim in-memory production repos | P2 |
| 6 | `CLAUDE.md` "Known gaps" | Superseded by 2026-07-26 hardening pass | P2 |
| 7 | `SESSION-HANDOVER.md` | Older snapshots conflict with current branch | P2 |
| 8 | Migration contract test | Runs on Windows; should run on POSIX CI runner | P2 |
| 9 | General | Keep docs matrix updated on story changes | Ongoing |

### 3.4 Remaining P3 features

From `docs/REMAINING-P3-FEATURES.md`. P3 total: 36/40 implemented.

| #     | Feature                       | Effort | Dependencies                         |
| ----- | ----------------------------- | ------ | ------------------------------------ |
| P3-82 | Confetti on lesson completion | S      | `canvas-confetti`                    |
| P3-83 | Drag-and-drop module reorder  | M      | `@dnd-kit/core`, `@dnd-kit/sortable` |
| P3-84 | Dark mode toggle              | L      | None                                 |
| P3-87 | In-app notifications          | XL     | Schema migration                     |

### 3.5 Simulator subject-matter (Phase 1 -- needs Ryan)

STORY-079 through STORY-084 are OPEN. Do NOT assign to an agent. These need Ryan's PPC expertise per the simulator accuracy audit -- the audit's central finding is that agents inventing plausible-looking answers is the exact failure mode being prevented.

---

## 4. Next sprint (Sprint 17) planning guide

Per `docs/sprint-plan.md`, Sprints 1–15 complete; Sprint 16 had STORY-085–088 complete, STORY-089 planned.

**Candidate work:**

1. **P1 -- Security hardening:** `lockedUntil` enforcement + `failedLoginCount`. Highest priority gap.
2. **P2–P3 -- Documentation refresh:** api-reference.md, db-schema.md, sprint-plan.md, CLAUDE.md, SESSION-HANDOVER.md.
3. **P2 -- Token lint:** Stylelint rule for CSS variables. Catches H-01/H-05 regressions.
4. **P2 -- Voice guide CI check:** Extend `local/no-ai-slop` for em-dashes, emoji, banned phrases.
5. **STORY-089:** Only remaining Phase 2 story. Can proceed if Phase 1 blocked on Ryan.

**Do NOT schedule Phase 1 (STORY-079–084) for agent work.**

---

## 5. File inventory (this document)

This file (`docs/SHIPPED-AND-REMAINING.md`) is the consolidation point. Update it whenever a story ships or an audit finding changes status. Audit docs retain their original "updates since" sections as historical record; this file is the live index.

---

## 6. PR merge status

| PR   | Title                                              | Status         |
| ---- | -------------------------------------------------- | -------------- |
| #497 | feat(admin): csv export for payments (P3-85)       | Merged to main |
| #498 | docs: mark P3-85 csv export as implemented (36/40) | Merged to main |

---

_This document was generated as the close-out record for the 2026-09-12 session. Commit `7617fe8` was the head of `main` at writing time; commit `d642bd2` adds this file._
