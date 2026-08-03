# STORY-095.5: Wire admin email templates into the Resend send path

**Points:** 1
**Epic:** Student-facing gap closure (real follow-up flagged by STORY-095's own doc; the
`STORY-098.5` fractional-numbering precedent already used in this repo makes `095.5` a
consistent name for a same-epic sequel)

## Status

**Status:** Done — 2026-08-03.

## Goal

STORY-095 built `/admin/email-templates` (list + upsert-by-type editor for the 7
`EmailTemplateType` rows) but the actual email-sending renderers
(`src/infra/email/templates/*.tsx`) never consulted `IEmailTemplateRepository` — editing a
template in the admin UI had zero effect on what Resend actually sent. This story closes
that gap for all 7 admin-editable types (`email_verification`, `password_reset`, `welcome`,
`receipt`, `refund`, `certificate`, `live_class_reminder`).

## What `EmailTemplate` actually customizes

`EmailTemplate` has 4 editable fields: `subject`, `headline`, `introBody`, `ctaLabel`. It
has **no `{{placeholder}}` interpolation** — the dynamic per-recipient data (amounts, dates,
order numbers, URLs) is not part of the template row at all; it's still supplied as
structured props to the renderer, exactly as before. This means:

- When an admin customizes `headline`/`introBody`, the override text **replaces the default
  verbatim** — any per-recipient detail baked into the default copy (e.g. the student's
  first name in `"Welcome, {firstName}!"`) is lost for that field once customized. This is a
  property of the domain model (no placeholder syntax exists), not a bug introduced here.
  Building `{{firstName}}`-style interpolation was explicitly out of scope — see STORY-095's
  own doc, which already flagged this as a real design decision, not an oversight.
- `subject` has the same limitation: several use cases interpolate dynamic data into the
  hardcoded subject line today (e.g. `SendLiveClassReminders`'s
  `` `Reminder: ${cls.title} starts in ${minutesUntilStart} minutes` ``) — a customized
  subject replaces that entirely with a static string.

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
  `emailTemplateRepo.findByType(<type>)` before sending, and uses `template?.subject ??
<hardcoded fallback>` for the subject plus the 3 override fields for the renderer call:
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
  itself errors): every call site falls back to the original hardcoded copy, so an
  uncustomized template sends byte-for-byte the same email as before this story — confirmed
  by the full existing test suite passing unchanged (no test needed updating; the only
  changes were new dependency wiring, not new assertions on old behavior).

## Explicitly out of scope

- **`PasswordChangedEmail` and `PaymentFailedEmail`** — neither has an `EmailTemplateType`
  slot (`EMAIL_TEMPLATE_TYPES` has exactly 7 values, matching the 7 wired here).
  `PaymentFailedRenderer` is also still fully dead code (not called by anything, per its own
  docblock) — unrelated to this story, not touched.
- **`RefundEmail` has no CTA button** — a pre-existing mismatch between the domain model
  (which requires `ctaLabel` non-empty for every type uniformly, including "refund") and the
  actual renderer (which never had a button in its design). Admins can still fill in
  `ctaLabel` for the refund template — the domain validation doesn't know it won't render —
  but `RefundEmail.tsx`'s `ctaLabelOverride` prop is accepted (for interface consistency
  with the other 6) and simply has nothing to apply to. Not fixed here: adding a button
  would be a new UI element this story didn't ask for, not a wiring fix.
- **`{{placeholder}}` interpolation inside custom copy** — see "What `EmailTemplate` actually
  customizes" above. Not needed for the wiring goal; would be new functionality.
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
