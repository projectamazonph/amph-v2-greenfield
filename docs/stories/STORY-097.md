# STORY-097: Student 2FA at /profile/security

**Points:** 1
**Epic:** Student-facing gap closure (recommended by `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`, where it was originally numbered STORY-093 — renumbered here because STORY-093 was already in use for an unrelated, already-shipped quiz UI bug fix)

## Status

**Status:** Done — 2026-08-02, production-readiness fix session.

## Goal

Admin accounts have had opt-in TOTP 2FA since the audit-hardening series
(`/admin/settings` → "Enable two-factor authentication"). The underlying use cases
(`EnableTwoFactor`/`ConfirmTwoFactor`/`DisableTwoFactor`) were always role-agnostic —
nothing in them checks `role === "ADMIN"` — but there was no route for a regular
student to reach them.

## What shipped

- `src/app/actions/studentTwoFactor.action.ts` — thin wrappers
  (`enableStudentTwoFactorAction`/`confirmStudentTwoFactorAction`/`disableStudentTwoFactorAction`)
  that reuse the exact same `performEnableTwoFactor`/`performConfirmTwoFactor`/`performDisableTwoFactor`
  helpers the admin action file (`src/app/actions/twoFactor.action.ts`) already exported,
  with redirect targets under `/profile/security` instead of `/admin/settings`. No new
  use-case logic — the only new thing is where a student lands.
- `src/app/profile/security/page.tsx` — status + enable/disable form, mirrors
  `/admin/settings`'s 2FA section (reuses its CSS module via a relative import rather
  than duplicating the stylesheet).
- `src/app/profile/security/2fa-setup/page.tsx` — QR/manual-entry key + confirmation
  code form, mirrors `/admin/settings/2fa-setup`.
- `/profile` links to `/profile/security` alongside the existing "Change Password" link.
- `src/app/actions/__tests__/studentTwoFactor.action.test.ts` — since the actual
  enable/confirm/disable logic is already covered by `twoFactor.action.test.ts`
  (unchanged, just reused), this file pins the redirect targets via a source-text
  assertion so a typo'd path can't silently point a student at an admin-only route.

## Known limitations

- Admin 2FA _enforcement_ (requiring it, not just offering it) is still not a thing
  for either role — that's a security/UX policy decision with real lockout risk for
  a solo-admin project, not something to decide unilaterally in this story.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run src/app/actions/__tests__/studentTwoFactor.action.test.ts src/app/actions/__tests__/twoFactor.action.test.ts
pnpm lint
```
