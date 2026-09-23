# STORY-162 — Profile /security: account at a glance + semantic 2FA badge + OAuth Remove confirm hook

**Type:** UI/UX refinement (UI/UX-7 of 7 surfaces)
**Status:** In progress
**Owner:** TBD
**Branch:** `uiux/profile`

## Why

The `/profile/security` page is structurally complete (two sections: 2FA + connected
accounts) but three gaps hurt comprehension:

1. **Color-blind operators can't tell enabled vs disabled 2FA.** The status badge is the same
   plain surface in both states — only the text differs. WCAG SC 1.4.1 says don't rely on
   colour alone, but we don't even have colour here. Adding a semantic tint + the
   existing text makes the state legible to all operators.
2. **No account posture at a glance.** A learner lands on /profile/security and has to scroll
   past the H1 + intro just to find out whether 2FA is on. The page already has the data;
   the layout just buries it.
3. **OAuth Remove silently removes a sign-in method.** The route handler does refuse the
   last-auth-method case server-side, but a stray click could still remove a non-essential
   connection with no in-page guard. Mirroring the `data-confirm` attribute pattern that
   `/admin`'s ConfirmDialog uses gives any future wired-up confirm UI a clear hook without
   forcing a client island on this otherwise-server page.

## In scope (this PR)

1. **Account-at-a-glance summary** — a 3-cell compact row under the H1, showing the
   signed-in email + verification status, the 2FA state, and the connected-accounts count.
   All three numbers come from session + the existing `oauthAccountRepo.listByUser(session.id)`.
2. **Semantic status badge variants** — `.statusBadgeEnabled` (green tint) and
   `.statusBadgeDisabled` (muted). Applied both to the at-a-glance cell and to the
   badge beneath each section's H2.
3. **`data-confirm` on the OAuth Remove buttons** — names the provider being removed.
   Same hook shape that ConfirmDialog in `/admin` already keys off of; no client
   island required on this page itself.

## Out of scope (deferred)

- **Wire the `data-confirm` hook into a real ConfirmDialog.** That's a follow-up PR
  that involves a global confirm UI; this PR establishes the contract.
- **Recent sign-in activity / active-sessions management.** Both would require new
  use cases + a new repository surface.
- **Bulk-remove all connected accounts button.** Single-click danger button, defer.

## Acceptance criteria

- [ ] Account-at-a-glance row renders above the 2FA section with email + 2FA state +
      OAuth count derived from live session + repo data.
- [ ] Status badge for "Enabled" 2FA uses the green-tinted variant; for "Disabled",
      the muted variant. The text remains in both cases so colour-blind operators
      still see the state.
- [ ] Every OAuth Remove button in the connected-accounts list carries a `data-confirm`
      attribute that names the provider.
- [ ] Tokens only; no hex / raw spacing / raw radius values appear in the new CSS rules.
- [ ] `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test src/app/profile` all green.

## Files

- Modify: `src/app/profile/security/page.tsx` — add at-a-glance summary, apply badge
  variants, attach data-confirm.
- Modify: `src/app/profile/profile-subpage.module.css` — add `.statusBadgeEnabled`,
  `.statusBadgeDisabled`, `.atGlance*` rules.
- Modify: `src/app/profile/__tests__/subroutes.a11y.test.tsx` — 5 new contracts under
  "STORY-162 · profile/security surface".
- New: this file.

## Definition of Done

- All acceptance criteria checked.
- Conventional commit `feat(profile): …`.
- Branch ready for the user to push & open PR against `main`.
