# STORY-095.5: Wire admin email templates into the Resend send path

**Points:** 1
**Epic:** Student-facing gap closure (real follow-up flagged by STORY-095's own doc; the
`STORY-098.5` fractional-numbering precedent already used in this repo makes `095.5` a
consistent name for a same-epic sequel)

## Status

**Status:** Done — 2026-08-03. Completed follow-up gaps on 2026-08-16.

## Goal

STORY-095 built `/admin/email-templates` (list + upsert-by-type editor for the 7
`EmailTemplateType` rows) but the actual email-sending renderers
(`src/infra/email/templates/*.tsx`) never consulted `IEmailTemplateRepository` — editing a
template in the admin UI had zero effect on what Resend actually sent. This story closes
that gap for all 7 admin-editable types (`email_verification`, `password_reset`, `welcome`,
`receipt`, `refund`, `certificate`, `live_class_reminder`).

## Current template behavior

`EmailTemplate` has 4 editable fields: `subject`, `headline`, `introBody`, and `ctaLabel`.
Each field supports the type-specific `{{variableName}}` entries displayed on the edit page.
Variables are resolved at send time for the individual recipient. For example, a verification
template can use `{{firstName}}`, `{{verificationUrl}}`, and `{{expiresInHours}}`, while a
refund template can use order, course, amount, reason, and dashboard-link values.

The domain factory rejects malformed or unavailable variables before a template is saved, so a
customized email cannot silently send a broken token. React Email escapes resolved values as
text. The structured blocks and CTA destinations remain controlled by the application.

The refund template now has a dashboard CTA, so its editable `ctaLabel` is rendered like the
other six templates. Uncustomized emails keep their original fallback copy.

## What shipped

- `src/ports/email/EmailTemplateOverride.ts` — a small shared type
  (`{ headlineOverride?, introBodyOverride?, ctaLabelOverride? }`) intersected into all 7
  renderer ports' `render(args)` parameter, so the 3 optional fields aren't repeated
  independently across 7 port files + 7 infra renderer classes + 7 `*Email.tsx` prop
  interfaces (21 places without it).
- All 7 `*Email.tsx` components (`EmailVerificationEmail`, `WelcomeEmail`,
  `PasswordResetEmail`, `CertificateEmail`, `RefundEmail`, `LiveClassReminderEmail`,
  `ReceiptEmail`) now render `headlineOverride ?? <default>`, `introBodyOverride ??
<default>`, `ctaLabelOverride ?? <default>` instead of hardcoded JSX text.
  `PasswordResetEmail` only overrides its first paragraph (the personalized "Hi
  {firstName}..." line) — the fixed second paragraph ("Click the button below...") is
  unaffected. `CertificateEmail`'s override replaces the `<strong>{courseTitle}</strong>`
  bold-formatted default with plain text (no bold, no course-title interpolation) when set.
- Every call site that triggers one of these 7 emails now fetches
  `emailTemplateRepo.findByType(<type>)` before sending, resolves supported variables in the
  subject and the 3 renderer override fields, then falls back to the original hardcoded copy
  when no template row exists:
  `ResendVerification.ts`, `VerifyEmail.ts`, `RequestPasswordReset.ts`,
  `IssueCertificate.ts`, `SendLiveClassReminders.ts` (fetches once per cron run, before the
  per-recipient loop — not once per email), the shared `sendRefundEmail()` helper in
  `ProcessRefund.ts` (used by both `ProcessRefund` and `RefundOverride`), and
  `sendReceiptEmail()` in `src/app/api/webhooks/paymongo/route.ts` (a route handler, not a
  use case — reads `container.emailTemplateRepo` directly).
- `emailTemplateRepo: IEmailTemplateRepository` added as a new dependency to all 7
  use cases' `Deps` interfaces and wired in both `buildProductionContainer()` and
  `buildTestContainer()`.
- Fallback behavior when no admin row exists (`findByType` returns `null`, or the repo call
  itself errors): every call site falls back to its original hardcoded copy. The refund email
  intentionally adds its dashboard CTA, so its editable CTA label is rendered even without an
  admin template.

## Follow-up completion: 2026-08-16

- `EmailTemplate` now owns the allowed-variable catalog and interpolation. The editor lists
  the right variables per template, and the update action returns the validation message to
  the admin when a token is malformed or unavailable for that email type.
- All seven send paths resolve the stored subject and body overrides with their recipient,
  order, class, certificate, and URL values before rendering. Focused tests cover validation,
  verification-email interpolation, refund interpolation, and the refund CTA.
- `RefundEmail` now renders a CTA to the student dashboard. The `ctaLabel` field is no longer
  a dead setting.
- The Resend webhook now verifies the documented Svix `svix-id`, `svix-timestamp`, and
  `svix-signature` contract against the raw body, including a five-minute replay window.
  Its tests call the production verifier with valid, invalid, tampered, stale, and
  multi-signature inputs instead of reimplementing a disconnected algorithm.
- All nine transactional scenarios now render through a unified, email-client-safe HTML system
  with a consistent brand frame, readable hierarchy, structured details, and clear notices. The
  non-editable password-changed and payment-failed messages are included; the payment-failed
  template remains reserved for provider-authoritative payment-failure events.

## Explicitly out of scope

- **`PasswordChangedEmail` and `PaymentFailedEmail` are not admin-editable** — neither has an
  `EmailTemplateType` slot (`EMAIL_TEMPLATE_TYPES` intentionally has exactly 7 values). Both
  use the shared HTML system; payment-failed delivery remains provider-authoritative, and its
  message copy is intentionally application-controlled.
- **A dedicated unit test for `sendReceiptEmail()`'s template-override branch** — the
  webhook route handler had zero unit test coverage of this function before this story
  (a pre-existing gap, not introduced here); the other 4 tested call sites (verification,
  certificate, refund, live-class-reminder) exercise the identical 3-line
  fetch-template/apply-override pattern.

## Verification

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test   # 3503 passed / 2 skipped (up from 3499/2 before this story)
pnpm test:arch  # 615/615
pnpm build      # succeeds
```
