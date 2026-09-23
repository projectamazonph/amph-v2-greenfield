# STORY-155: Admin user management (edit, set password, force sign-out, delete)

**Status:** Done (this PR; code + tests + boundary suite complete, PR link pending)
**Depends on:** STORY-047 (admin users list + user detail + impersonate)
**Epic:** Admin panel

## Goal

Give admins full control of user accounts from `/admin/users/[id]` without touching the database:
correct names, change roles, reset a password for a locked-out student, force a compromised session
off the platform, and remove an account entirely.

## Scope

- **Edit profile** (`AdminUpdateUser`): first name, last name, and role (STUDENT / INSTRUCTOR / ADMIN).
- **Set password** (`AdminSetUserPassword`): server-side strength check (same scoring as
  `ResetPassword`), Argon2id hash, revokes every active session, optional notification email via
  `PasswordChangedRenderer`.
- **Force sign-out** (`AdminForceSignOut`): revokes all sessions without changing credentials.
- **Delete account** (`AdminDeleteUser`): reuses `UserRepository.anonymizeAndDelete()` (PII scrub +
  `deletedAt`), revokes sessions. Order, enrollment, certificate, and audit rows are preserved per
  the receipt-retention rule in `docs/business-layer.md`.
- `role` added to the `UserRepository.update()` patch (port, Prisma adapter, InMemory fake).
- Four new audit actions: `user.profile_updated`, `user.password_changed_by_admin`,
  `user.deleted_by_admin`, `user.sessions_revoked`.

## Guards

- An admin cannot delete their own account (`cannot_delete_self`).
- An admin cannot change their own role (`cannot_change_own_role`); the role field is omitted from
  the form when viewing your own account.
- Password strength validated server-side (`weak_password`), never trusted from the client.

## Acceptance criteria

- [x] Four use cases with unit tests (fakes + FixedClock): `AdminUpdateUser`,
      `AdminSetUserPassword`, `AdminDeleteUser`, `AdminForceSignOut` under
      `src/usecases/__tests__/`.
- [x] Four server actions gated by `requireAdmin()`, actor injected from the session.
- [x] Both containers wire the new use cases (`container.ts`, `container.test.ts`).
- [x] Every mutation audit-logged with the actor id.
- [x] Boundary suite `src/app/actions/__tests__/adminUserManagement.action.test.ts` (success,
      failure mapping, authorization) registered in `admin-action-coverage.inventory.test.ts`.
- [x] `docs/ADMIN-EVENT-COVERAGE.md` row for the new surface.

## Definition of Done

- `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test` pass.
- No `any` in new or changed files.
- CHANGELOG and FEATURES.md updated in the same PR.
