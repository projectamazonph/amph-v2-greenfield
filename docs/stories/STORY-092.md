# STORY-092 — Certificate admin list, detail, and revoke

**Status:** Done
**Owner:** Ryan Roland Dabao
**Sprint:** Sprint 6/7/9 completeness-gaps
**Depends on:** STORY-041 (Certificate model), STORY-043 (public verify), STORY-044 (RevokeCertificate)

---

## Overview

This story closes the certificate-admin gap surfaced during the Sprint 6/7/9 completeness audit (see `docs/audit-2026-07-27-completeness-review.md` and the PRD at `.archon/ralph/sprints-6-7-9-completeness-gaps/prd.md`).

The `Certificate` domain model, `IssueCertificate`, `VerifyCertificate` (public view), and `RevokeCertificate` + its server action were all already shipped — but there was **no admin surface to list issued certificates or drive the existing revoke action from a UI**. An admin handling a certificate dispute (wrong course completion, fraud, refund-triggered revocation not caught by the automatic path) had no choice but to write SQL. `ICertificateRepository` also had no method to list all certificates (only `findByUserId`), so even a custom script would have been awkward.

This story ships:

- **`ICertificateRepository.listAll(filters?)`** — `Result<readonly Certificate[], CertificateRepositoryError>`, sorted `issuedAt desc`, with optional `status` filter.
- **`AdminListCertificates` + `AdminGetCertificate`** use cases — admin list/detail joins, batch-hydrating `user` + `course` via dedupe-then-loop `Map` (mirroring `ListRefundRequests.ts:76-88`).
- **Audit-log fix in `revokeCertificate.action.ts`** — every successful revoke (including the `wasAlreadyRevoked: true` idempotent-replay case) now records a `certificate.revoked` audit entry, closing the gap that STORY-044 explicitly deferred to the caller.
- **3 admin pages** at `/admin/certificates`, `/admin/certificates/[id]`, plus the `AdminCertificatesTable` Astryx component, a new "Certificates" link in the admin `NavSidebar`, and a `docs/admin-backend.md` update describing the shipped surface.

## Acceptance criteria (from PRD)

All PRD US-007 / US-008 / US-009 acceptance criteria met:

- [x] `ICertificateRepository.listAll(filters?: { status?: CertificateStatus })` added; InMemory + Prisma adapters implemented; sorted `issuedAt desc`; unit tests for both adapters including the empty-store case.
- [x] `port-segregation.test.ts` still passes (ICertificateRepository goes from 5 to 6 methods, cap is 12).
- [x] `AdminListCertificates.ts` with optional `status` filter, returns `Result<{certificates, users, courses}, AdminListCertificatesError>`, batch-hydrating users/courses via dedupe-then-loop.
- [x] `AdminGetCertificate.ts` mirrors `AdminGetPayment` single-record join with `not_found` cascade for cert, user, course.
- [x] `AuditAction.ts` gained `certificate.revoked` in both the type union and `ALL_ACTIONS` array (in commit `be4a7e4` from PR #220).
- [x] `revokeCertificate.action.ts` now calls `recordAuditLog` on the success path with action `certificate.revoked`, targetType `certificate`, targetId `certificateId`, metadata `{ reason, courseId, userId, wasAlreadyRevoked }`. The `RevokeCertificate` use case itself is NOT modified (audit logging stays the caller's responsibility per its existing design).
- [x] Both new use cases wired into `src/composition/container.ts` and `container.test.ts`.
- [x] Colocated tests for both new use cases with real assertions: happy path, `not_found`, and (for `AdminListCertificates`) correct Map hydration with duplicate `userId`/`courseId` collapsed to single lookups. (See `src/usecases/__tests__/AdminListCertificates.test.ts` and `AdminGetCertificate.test.ts`.)
- [x] Test for `revokeCertificate.action.ts` updated to assert `recordAuditLog.execute` was called with the expected `action`/`metadata` on successful revoke, including the idempotent-replay case, and NOT called on any error path.
- [x] `pnpm typecheck` passes with 0 errors.
- [x] `pnpm lint` passes with 0 errors.
- [x] `pnpm test:arch` passes (539/539).
- [x] `pnpm vitest run tests/unit/ src/` passes (2591/0).
- [x] `pnpm build` succeeds (admin cert pages compile + bundle).

## Pages shipped (US-009)

| Path                                              | Description                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `/admin/certificates`                             | List of every cert with status tabs (All / Active / Revoked) and live counts                       |
| `/admin/certificates/[id]`                        | Detail view + revoke form (hidden when already revoked); redirects back with search-param feedback |
| `src/components/admin/AdminCertificatesTable.tsx` | Astryx `Table` client component, truncation helper for 64-char verification hash                   |
| `src/components/admin/NavSidebar.tsx`             | New "Certificates" nav item                                                                        |

## Design decisions

1. **No separate `AdminListActiveCertificates` class.** `AdminListCertificates` already accepts an optional `status` filter — splitting it would be pure duplication. The list page tab navigation calls `adminListCertificates.execute({ status: "active" })` directly. Easy to extract later if a separate class is preferred.
2. **Audit log lives in the action, not the use case.** `RevokeCertificate.ts` deliberately does not call `recordAuditLog` (its design comment says "caller's responsibility") and the PRD respects that. We add the call to the **action** so automated callers (e.g. a future refund processor calling `revokeCertificate.execute({ revokedBy: "system", ... })` directly) can record their own audit entry with whatever metadata they want, without coupling the use case to `RecordAuditLog`.
3. **Hash truncation is inline, no shared util.** The 64-char hex hash truncates to `first 8 + "…" + last 4` (~13 chars). No `src/lib/truncate` exists yet; future story may extract.
4. **No E2E test added in this PR.** The PRD lists an E2E flow for the admin revoke (list → open → revoke → see status flip). That belongs to the US-010 final-integration story, which already exists in the PRD and runs `pnpm test:e2e` as part of its gate. We did add the action-level coverage for the audit-log call, which is the security-relevant behavior — the E2E is "just" a UI smoke test.
5. **Revoke form is `FormData`-driven, not a closed-over variable.** The `handleRevoke` server action reads `reason` from `FormData` rather than from a closed-over variable, so the form's `<textarea name="reason">` is the single source of truth. Matches the pattern in `src/app/admin/refunds/[orderId]/page.tsx`'s `handleProcessRefund`.

## Files touched

- **New use cases** (US-008):
  - `src/usecases/AdminListCertificates.ts`
  - `src/usecases/AdminGetCertificate.ts`
- **Repo** (US-007):
  - `src/ports/repositories/ICertificateRepository.ts` — `listAll(filters?)`
  - `src/infra/repositories/PrismaCertificateRepository.ts` — `listAll` impl
  - `src/infra/repositories/InMemoryCertificateRepository.ts` — `listAll` impl
  - `src/infra/repositories/__tests__/InMemoryCertificateRepository.listAll.test.ts`
- **Audit fix** (US-008 Architecture Note 6):
  - `src/app/actions/revokeCertificate.action.ts` — `recordAuditLog.execute(...)` on success
  - `src/app/actions/__tests__/revokeCertificate.action.test.ts` — audit-call assertions
- **Container wiring** (US-008):
  - `src/composition/container.ts` — `adminListCertificates`, `adminGetCertificate`
  - `src/composition/container.test.ts` — same
- **Use case tests** (US-008):
  - `src/usecases/__tests__/AdminListCertificates.test.ts`
  - `src/usecases/__tests__/AdminGetCertificate.test.ts`
- **Pages** (US-009):
  - `src/app/admin/certificates/page.tsx` — list with tabs
  - `src/app/admin/certificates/page.module.css`
  - `src/app/admin/certificates/[id]/page.tsx` — detail + revoke form
  - `src/app/admin/certificates/[id]/page.module.css`
  - `src/components/admin/AdminCertificatesTable.tsx` — Astryx `Table` client component
  - `src/components/admin/NavSidebar.tsx` — Certificates nav item
- **Docs**:
  - `docs/admin-backend.md` — new "Certificates" section + layout tree row
  - `docs/stories/STORY-092.md` — this file

## Out of scope (deferred)

- Re-issuing a certificate after revocation. STORY-041 explicitly deferred this; still out of scope.
- Bulk revoke. Out of scope — one cert at a time, with a clear reason, is the correct UX for fraud / dispute handling.
- E2E test for the admin revoke flow. Belongs to US-010 (final integration).
- Per-cert "re-issue" workflow. Same STORY-041 deferral.
