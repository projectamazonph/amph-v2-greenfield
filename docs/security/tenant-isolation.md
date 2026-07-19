# Tenant Isolation Audit (Per-User Query Guard)

**Status:** Approved (greenfield, day-0 design)
**Owner:** Ryan Roland Dabao
**Reviewer:** self-audit (single-tenant operation pre-launch)

This document enumerates every server-side data access that touches user-owned data, and records the guard mechanism in place to prevent one student or admin from reading or mutating another student's data.

Project Amazon PH Academy v2 is a single-tenant application. There are three roles (`STUDENT`, `ADMIN`, `SUPER_ADMIN`) but only one tenant boundary: the `User.id`. ADR-015.

---

## Methodology

For each server action, route handler, and Prisma query that touches user-owned data, we record:

1. **Where** — the file path
2. **Guard** — the explicit code path that restricts access to the caller's own data (or to admins)
3. **Bypass risk** — any way the guard could be skipped (intentionally or by mistake)
4. **Verification** — how we prove the guard works (unit test, integration test, code review, manual)

The audit is re-run before every release. New code that touches user-owned data MUST add an entry to this table before merging.

---

## Guiding Principles

1. **All user-owned data is filtered by `userId`.** The use case is the boundary; the use case loads the row, checks the `userId`, then returns. Pages and actions never query the database directly.
2. **Admins are explicitly allowed cross-user access.** Every admin use case requires `actorId`, validates the role, logs the action to `AuditLog`. Admin access is not implicit; it is granted per-call.
3. **IDs are CUIDs.** Not auto-increment, not UUID. CUIDs are not enumerable. A user cannot guess another user's `id` from a sequence.
4. **JWTs include `userId` and `tokenVersion`.** The session is verified on every request. `tokenVersion` mismatches revoke the session.
5. **Resource ownership is checked at the use case, not at the page.** A user can navigate to `/payments/<other-user-payment-id>`, but the page calls `getPaymentForUser(paymentId, currentUserId)`, which returns 404 if the payment is not theirs.

---

## Guards by Use Case

| Use case | Where | Guard | Bypass risk | Verification |
|----------|-------|-------|-------------|--------------|
| `SignUp` | `src/usecases/auth/SignUp.ts` | None (public) | n/a | E2E test |
| `SignIn` | `src/usecases/auth/SignIn.ts` | None (public) | n/a | E2E test |
| `VerifyEmail` | `src/usecases/auth/VerifyEmail.ts` | Token hash lookup; no user input on userId | Token theft | Token is single-use, 24h TTL, sha256-hashed in DB |
| `RequestPasswordReset` | `src/usecases/auth/RequestPasswordReset.ts` | None (public, always returns `sent: true`) | n/a | E2E test |
| `ResetPassword` | `src/usecases/auth/ResetPassword.ts` | Token hash lookup; `tokenVersion` incremented (revokes all sessions) | Token theft | Token is single-use, 1h TTL, sha256-hashed in DB |
| `StartCheckout` | `src/usecases/checkout/StartCheckout.ts` | `userId` from session; cannot specify another user's userId in input | Input tampering | Schema: `userId` not in input, comes from session |
| `HandlePaymentWebhook` | `src/usecases/checkout/HandlePaymentWebhook.ts` | Webhook signature verification; idempotency by event ID | Signature forgery | HMAC-SHA256 with `PAYMONGO_WEBHOOK_SECRET`; tested with `FakePayMongoGateway` |
| `EnrollStudent` | `src/usecases/enroll/EnrollStudent.ts` | `userId` from input, validated by caller; not exposed in user input | Called from webhook with verified userId | Integration test |
| `RevokeEnrollment` | `src/usecases/enroll/RevokeEnrollment.ts` | Admin only; `actorId` required | Role escalation | `requireAdmin()` at action; use case asserts role |
| `RequestRefund` | `src/usecases/refund/RequestRefund.ts` | `userId` from session; input is `{ paymentId, reason }`; use case checks `payment.userId === userId` | Cross-user refund | Unit test: `RequestRefund` with `userId !== payment.userId` returns `not_owner` |
| `AdminIssueRefund` | `src/usecases/refund/AdminIssueRefund.ts` | Admin only; `actorId` required; AuditLog entry | Role escalation | `requireAdmin()` at action; use case asserts role |
| `IssueCertificate` | `src/usecases/certificate/IssueCertificate.ts` | `userId` from session; `enrollment.userId === userId` checked | Cross-user certificate | Unit test: mismatched userId returns `enrollment_not_found` |
| `VerifyCertificate` | `src/usecases/certificate/VerifyCertificate.ts` | None (public; hash is the auth) | n/a | Hash is sha256(userId + courseId + issuedAt + SECRET); tampering fails the verify |
| `RevokeCertificate` | `src/usecases/certificate/RevokeCertificate.ts` | Admin only | Role escalation | `requireAdmin()` at action |
| `RunBidElevator` (and the 4 other simulators) | `src/usecases/simulators/Run<Name>.ts` | `userId` from session; `AccessPolicy.canUseSimulator` checks tier | Cross-tier access | Unit test: Foundations user accessing Listing Audit returns `tier_insufficient` |
| `MarkLessonComplete` | `src/usecases/progress/MarkLessonComplete.ts` | `userId` from session; `enrollment.userId === userId` checked; `AccessPolicy.canAccessCourse` | Cross-user progress | Unit test: mismatched userId returns `enrollment_not_found` |
| `RecordQuizAttempt` | `src/usecases/progress/RecordQuizAttempt.ts` | Same as above | Same as above | Same as above |
| `RecordStreakVisit` | `src/usecases/progress/RecordStreakVisit.ts` | `userId` from session; `StreakService` is pure (no IO) | None | n/a |
| `RecordSimulatorAttempt` | `src/usecases/progress/RecordSimulatorAttempt.ts` | Wraps `Run<Simulator>`; same guards | Same as above | Same as above |
| `AwardBadge` | `src/usecases/badges/AwardBadge.ts` | `userId` from session; criteria-checked before award | Cross-user badge | Unit test: criteria not met returns `criteria_not_met` |
| `RevokeBadge` | `src/usecases/badges/RevokeBadge.ts` | Admin only | Role escalation | `requireAdmin()` at action |
| `AdminUpdateUser` | `src/usecases/admin/AdminUpdateUser.ts` | Admin only; `actorId` required; AuditLog entry | Role escalation | `requireAdmin()` at action |
| `AdminCreateDiscountCode` (and other admin use cases) | `src/usecases/admin/*.ts` | Admin only; AuditLog entry | Role escalation | `requireAdmin()` at action |
| `AdminExportAuditLog` | `src/usecases/admin/AdminExportAuditLog.ts` | Admin only; CSV download is operator-only | Role escalation | `requireAdmin()` at action |

---

## Guards by Page

| Page | Where | Guard | Bypass risk | Verification |
|------|-------|-------|-------------|--------------|
| `/dashboard` | `src/app/(dashboard)/dashboard/page.tsx` | `requireUser()` in `(dashboard)/layout.tsx` | Unauthenticated access | E2E test: signed-out visit redirects to `/signin` |
| `/courses/[courseSlug]` | `src/app/(dashboard)/courses/[courseSlug]/page.tsx` | `requireUser()`; `AccessPolicy.canAccessCourse` returns "not_enrolled" → redirect to `/pricing` | Access without enrollment | E2E test |
| `/courses/[courseSlug]/lessons/[lessonSlug]` | `src/app/(dashboard)/courses/[courseSlug]/lessons/[lessonSlug]/page.tsx` | Same as above; in addition, lesson must belong to a module that belongs to the course | Lesson not in course | E2E test |
| `/tools/[tool]/[slug]` | `src/app/(dashboard)/tools/[tool]/[slug]/page.tsx` | `requireUser()`; `AccessPolicy.canUseSimulator` | Cross-tier tool access | E2E test |
| `/payments/[id]` | `src/app/(dashboard)/payments/[id]/page.tsx` | `requireUser()`; use case returns 404 if `payment.userId !== currentUser.id` | Cross-user payment view | E2E test |
| `/certificates/[hash]` | `src/app/(dashboard)/certificates/[hash]/page.tsx` | Public; hash is the auth | n/a | Hash verification: `CertificateIssuer.verifyHash` |
| `/live-classes` | `src/app/(dashboard)/live-classes/page.tsx` | `requireUser()`; Ultimate tier check | Non-Ultimate access | E2E test |
| `/admin/*` | `src/app/admin/layout.tsx` | `requireAdmin()` | Non-admin access | E2E test |
| `/admin/users/[id]` | `src/app/admin/users/[id]/page.tsx` | `requireAdmin()` | Non-admin access | E2E test |
| `/admin/users/[id]/impersonate` | `src/app/admin/users/[id]/impersonate/route.ts` | `requireAdmin()` + super-admin role check | Admin impersonating | Use case asserts role; AuditLog entry |

---

## Guards by Route Handler

| Route | Where | Guard | Bypass risk | Verification |
|-------|-------|-------|-------------|--------------|
| `POST /api/paymongo/webhook` | `src/app/api/paymongo/webhook/route.ts` | HMAC-SHA256 signature verification | Signature forgery | Integration test: invalid signature returns 401 |
| `POST /api/resend/webhook` | `src/app/api/resend/webhook/route.ts` | Resend signature verification | Signature forgery | Integration test |
| `GET /certificates/[hash]/pdf` | `src/app/(dashboard)/certificates/[hash]/pdf/route.ts` | Public; hash is the auth | n/a | Hash verification |

---

## Direct Prisma Queries

A grep for `prisma.` in `src/app/` and `src/components/` should return zero matches. All database access goes through a repository, which is only called from a use case, which is only called from a server action or RSC.

```bash
# Should return 0 results (the rule, not the grep)
grep -r "from \"@prisma/client\"" src/app src/components
grep -r "prisma\\." src/app src/components
```

A pre-commit hook enforces this. CI runs the grep as a check.

The only places `prisma` is referenced are:
- `src/infra/db/prisma/*.ts` — repository implementations
- `src/infra/db/prisma/client.ts` — the singleton
- `prisma/seed.ts` — the seed script (used in dev and CI only)
- `tests/e2e/helpers/db.ts` — test helper for e2e setup/teardown

---

## JWT and Session Guards

| Concern | Guard |
|---------|-------|
| JWT secret | `JWT_SECRET` env var, min 32 bytes. `gen:secret` script generates one. CI fails if `JWT_SECRET` is not set in production env. |
| JWT algorithm | HS256. `jose` library. |
| JWT lifetime | 7 days, sliding. The session is renewed on every request if the cookie is valid and the `tokenVersion` matches. |
| Cookie attributes | `HttpOnly`, `Secure` (in production), `SameSite=Lax`, `Path=/`, `__Secure-` prefix in production. |
| `tokenVersion` | Incremented on: password change, admin force sign-out, role change. Mismatched `tokenVersion` revokes the session. |
| CSRF | Server actions are CSRF-protected by Next.js (origin check). Webhooks verify their own signatures. |
| Origin check | Server actions: Next.js checks the `Origin` header against the deployment URL. Custom `allowedOrigins` is configured in `next.config.ts`. |

---

## Input Validation

Every server action and route handler validates input with Zod before calling the use case. Validation failures return `Result.err({ kind: "validation_failed", issues })` and are not passed to the use case.

The `SignUp` use case additionally validates the password with a separate `validatePassword` function (length, complexity). This is a business rule, not a shape rule; it lives in `src/domain/auth/password.ts`.

## Output Encoding

| Surface | Encoding |
|---------|----------|
| RSC | React handles encoding by default |
| Server action JSON response | `JSON.stringify` with safe serialization |
| PDF | `ReactPdfRenderer` escapes user input |
| Email | `ReactEmailRenderer` escapes by default |
| Receipt / certificate number | `CUID` + prefix; no user input |

## Security Headers

Configured in `next.config.ts`:

- `Content-Security-Policy`: `default-src 'self'; script-src 'self' 'nonce-...'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://res.cloudinary.com; font-src 'self' data:; connect-src 'self' https://api.paymongo.com; frame-ancestors 'none'`
- `Strict-Transport-Security`: `max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options`: `DENY`
- `X-Content-Type-Options`: `nosniff`
- `Referrer-Policy`: `strict-origin-when-cross-origin`
- `Permissions-Policy`: `camera=(), microphone=(), geolocation=(), interest-cohort=()`

The CSP nonce is generated per request in middleware. (Implementation detail deferred to STORY-051 / Sentry + observability sprint.)

## Audit Log Coverage

Every admin mutation, every auth event, every payment event, every refund event is written to `AuditLog`. See `docs/admin-backend.md` §"Audit Log: What Gets Logged" for the full list.

## Pre-Release Audit Checklist

- [ ] Grep: zero `prisma.` matches in `src/app/` or `src/components/`.
- [ ] Grep: zero `from "@prisma/client"` matches in `src/app/` or `src/components/`.
- [ ] Every server action validates input with Zod.
- [ ] Every use case checks `userId` ownership (or admin role) before mutating user-owned data.
- [ ] Every admin use case writes to `AuditLog`.
- [ ] Every webhook handler verifies the provider's signature.
- [ ] Every page in `/admin/*` calls `requireAdmin()`.
- [ ] Every page in `/(dashboard)/*` calls `requireUser()` (transitively, via layout).
- [ ] `JWT_SECRET` is set in production env, min 32 bytes.
- [ ] `__Secure-` cookie prefix is used in production.
- [ ] CSP nonce is generated per request.
- [ ] All security headers are set in `next.config.ts`.
- [ ] E2E tests cover the 6 critical journeys at 3 viewports.
- [ ] axe accessibility checks pass with zero violations.
- [ ] Lighthouse perf ≥ 0.85, a11y/bp ≥ 0.95, seo ≥ 0.9, LCP ≤ 4000ms, TBT ≤ 300ms.
- [ ] `gitleaks detect` passes.
- [ ] `npm audit` reports no high or critical vulnerabilities.

## Re-Audit Cadence

- **Every release.** Re-run the grep and the checklist.
- **Every new use case or page.** Add an entry to this table in the same PR.
- **Every new admin mutation.** Audit-log coverage must be added in the same PR.
- **Quarterly.** Full audit pass with two reviewers (Ryan + one external reviewer if available).

## Sprint 11 Update

- Added `RateLimiter` guard (STORY-054): auth and payment actions now rate-limit by caller key, preventing brute-force enumeration of user-owned resources.
- Added Sentry `onRequestError` instrumentation (STORY-051): errors are captured without exposing `userId` or PII in event titles.
- Added structured logging redaction (STORY-052): `password`, `token`, `secret`, `cookie`, `authorization`, `apiKey`, and nested variants are redacted before any log leaves the process.
- E2E critical-journey coverage added (STORY-055): signup→dashboard, course browse, and placeholder admin journeys. Admin journeys require seeded admin users before they can run unsuspended.

## Open Issues

1. **Admin E2E journeys need seeded admin users.** `tests/e2e/critical-journeys.spec.ts` journeys 3–6 are skipped until a deterministic admin seed helper is available. This is tracked as a follow-up to STORY-055.
2. **Pre-release CSP nonce.** The checklist item "CSP nonce is generated per request" is still pending; the current `next.config.ts` does not set security headers. Address in a follow-up security hardening story.
3. **Rate limits are not yet wired into actions.** The `RateLimiter` port and adapters are in place; wiring `signUpAction`, `loginAction`, and payment actions to call `rateLimiter.check()` is deferred to the first story that touches those actions (STORY-006 follow-up or P0-7).
