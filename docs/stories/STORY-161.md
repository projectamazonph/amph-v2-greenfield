# STORY-161 — Auth forms: hide TOTP until needed + signup terms note

**Type:** UI/UX refinement (UI/UX-6 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/auth`

## Why

Two small but real UX gaps on the auth surface:

1. **Login TOTP field was always visible.** Every login render — including first paint for the
   > 90% of accounts that don't enroll two-factor authentication — showed a TOTP field with the
   > "Only needed if you've enabled two-factor" hint. The route handler silently ignored the empty
   > field, so the always-visible TOTP field was pure noise on first paint.
2. **Signup submit button had no in-place terms / payment-method context.** Without a terms
   and "this is where your money goes" line, the submit reads as a free action.

These are pure forms (no client state machine, real HTML POST, no React 19 client islands
involved), so the fixes are small and surgical.

## In scope (this PR)

1. **`/login` LoginForm** — render the TOTP `<Input>` only when the `errorKind` prop is
   `totp_required` or `invalid_totp_code`. The route handler accepts the missing field
   silently, so this is safe by design now (it was previously safe by accidental omission).
2. **`/signup` SignupForm** — add a small token-only terms + PayMongo payment-method line
   above the submit button. Lift the divider line so the terms reads as a footnote to
   the submit.
3. **Tests**
   - `src/app/login/__tests__/LoginForm.test.tsx` (new) — six contracts covering
     TOTP visibility across `null`, `invalid_credentials`, `totp_required`,
     `invalid_totp_code`, plus `redirectTo` pass-through.
   - `src/app/signup/__tests__/page.test.tsx` (extended) — three contracts covering the
     terms line, tier-aware submit copy, and plain submit copy.

## Out of scope (deferred)

- **Show / hide password toggle.** Common UX improvement but the existing `Input` primitive
  is shared with many forms; promoting a single form to a controlled state would mean either
  adding a new controlled variant of Input or passing through a custom suffix that LoginForm
  renders. Both are wider than this PR. Defer.
- **Live password-strength meter.** Same scope issue: needs a client island and a
  password-rule evaluator.
- **Login page chrome (page background, brand mark above the form).** Out of scope — the
  page renders inside a StudentShell-less shell since it's pre-auth.
- **Reset-password / verify-email pages.** These are independent surfaces; review next pass.

## Acceptance criteria

- [ ] First-paint `/login` does not contain the TOTP input.
- [ ] Reloading `/login?error=totp_required` shows the TOTP input and focuses it.
- [ ] Reloading `/login?error=invalid_credentials` (or null) does not show the TOTP input.
- [ ] `/signup` shows the terms + payment-method line above the submit button for both
      the no-tier and the tier-flow (`tier=mastery`) renders.
- [ ] Tokens only; no hex / raw spacing / raw radius values appear in the new CSS rules.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test src/app/login src/app/signup` all green.

## Files

- Modify: `src/app/login/LoginForm.tsx` — wrap the TOTP input in `{needsTotp ? … : null}`.
- Modify: `src/app/signup/SignupForm.tsx` — add the `<p class="terms">…</p>` above the submit.
- Modify: `src/app/signup/signup.module.css` — add `.terms` rule.
- New: `src/app/login/__tests__/LoginForm.test.tsx`.
- Modify: `src/app/signup/__tests__/page.test.tsx`.
- New: this file.

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(auth): …`.
- Branch ready for the user to push & open PR against `main`.
