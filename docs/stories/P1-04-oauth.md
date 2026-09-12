# P1-04 — OAuth social login (PR-D)

**Status:** Implemented — merged on `main`. Entity (`OAuthAccount`), ports (`IOAuthAccountRepository`, `IOAuthBroker`), Prisma + InMemory adapters, `GoogleOAuthBroker`, `StubOAuthBroker`, two use cases (`LoginWithOAuth`, `UnlinkOAuthAccount`), API routes (`/api/auth/oauth/[provider]`, `/api/auth/oauth/[provider]/callback`), server action (`unlinkOAuth.action.ts`), login page Google button, and profile security page all ship. Env-gated: no `GOOGLE_CLIENT_ID/SECRET` means no button. See `FEATURES.md` and `CHANGELOG.md` for confirmation.

## Scope

Google sign-in (the only wired provider) with login, verified-email
auto-signup, account linking, and unlinking. Hand-rolled OAuth2 +
PKCE behind ports — no new dependencies.

- Domain `OAuthAccount` entity: provider allowlist
  (google/facebook/github per schema), non-blank ids.
- Port `IOAuthAccountRepository` plus InMemory and Prisma adapters.
- Port `IOAuthBroker` (authorize URL, code exchange, profile
  fetch) plus a Google `fetch` adapter and a stub for tests.
- `LoginWithOAuth`: verified email only; existing link signs in;
  matching email links; otherwise STUDENT/FREE auto-create
  (audited `user.signed_up`) with an empty password hash meaning
  no password. 2FA-enabled users are refused with
  `two_factor_required` (OAuth must not bypass TOTP). Session
  issuance mirrors `Login` (sessionRepo + JWT).
- `UnlinkOAuthAccount`: refuses to remove the last auth method
  (no password and no other links).
- Third-party callbacks are API routes per Rule 4:
  `GET /api/auth/oauth/[provider]` (start) and
  `.../[provider]/callback`. State via short-lived HttpOnly
  cookie. Env-gated: no `GOOGLE_CLIENT_ID/SECRET` means no Google
  button and a 404 on the routes.
- Login page Google button; profile security page lists links
  with unlink actions. Every mutation audited
  (`oauth_account.linked/unlinked`).
- No new migration: the W0-01 `oauth_accounts` table already
  carries every column.

## Out of scope

- Facebook/GitHub adapters (entity allows them; use cases return
  `provider_not_configured`). Follow-up slices.
- Password set for OAuth-created users (account recovery covers it).
- Profile name syncing on later logins (first link wins).

## Verification

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm build` green.
- New suites: OAuthAccount entity, InMemoryOAuthAccountRepository,
  LoginWithOAuth (link/match/create/2FA-refusal), UnlinkOAuth
  (last-method guard), callback route tests with a stub broker.
- Manual (Google test client): button hidden without env; login,
  auto-signup, and unlink behave per the story.
