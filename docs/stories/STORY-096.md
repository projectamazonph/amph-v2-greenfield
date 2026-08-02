# STORY-096: Account deletion + data export

**Points:** 1
**Epic:** Student-facing gap closure (recommended by `docs/STUDENT-FEATURE-GAP-ANALYSIS.md`)

## Status

**Status:** Done, with a stated caveat — 2026-08-02, production-readiness fix session.

## Goal

Neither account deletion nor a self-service data export existed anywhere in the app before
this story. `User.deletedAt` already existed on the Prisma schema (unused).

## What shipped

### Account deletion

- `UserRepository.anonymizeAndDelete(userId, anonymizedEmail)` — new port method,
  implemented in both `PrismaUserRepository` and `InMemoryUserRepository`. Overwrites
  email/firstName/lastName/phone/avatarUrl/bio/password with anonymized placeholders,
  clears the TOTP secret, disables 2FA, and stamps `deletedAt`. Deliberately does **not**
  touch or cascade-delete `Order`, `Enrollment`, `Certificate`, or other financial/academic
  records — those keep referencing the userId so receipts, certificates, and audit trails
  survive account deletion (tax/compliance requirement, and certificate verification would
  otherwise break for anyone who deleted their account after earning one).
- `src/usecases/DeleteUserAccount.ts` — requires the current password as re-confirmation
  (mirrors `DisableTwoFactor`'s pattern: a destructive security action re-checks "something
  you know," not just a live session). On success: anonymizes the user row, revokes every
  session (`sessionRepo.deleteAllForUser`), and audits `user.account_deleted`.
- `src/app/actions/deleteAccount.action.ts` + a danger-zone form on `/profile/data`.

### Data export

- `src/usecases/ExportUserData.ts` — gathers profile, orders, enrollments, certificates,
  badge awards, XP events, and progress events for one user via each repository's existing
  `findByUserId` method, into a single JSON-serializable object.
- `src/app/actions/exportUserData.action.ts` + `src/components/profile/ExportDataButton.tsx`
  (a client component — triggering a browser file download from a server action's return
  value needs client-side code, one of the few genuinely client pieces in the profile
  section) on `/profile/data`. Also audits `user.data_exported`.
- As a side effect: `IProgressEventRepository`/`PrismaProgressEventRepository` (both already
  existed, from an earlier, unrelated feature) had never been wired into either container.
  Wired in as part of this story since `ExportUserData` needed it.

## Known limitation — stated on the page itself

**The export does not include quiz or simulator attempt history.** `IQuizAttemptRepository`
and `ISimulatorAttemptRepository` only support per-quiz/per-scenario lookups
(`findByUserAndQuiz`, `findByUserAndScenario`), not "every attempt by this user across
everything." Adding that would mean new port methods on both repositories plus both
adapters, which was judged out of scope for this pass; the export's own `notes` field and
the page copy say so explicitly rather than silently omitting the categories.

## Verification

```bash
pnpm tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm vitest run src/usecases/__tests__/DeleteUserAccount.test.ts src/usecases/__tests__/ExportUserData.test.ts src/infra/repositories/__tests__/PrismaUserRepository.twoFactor.test.ts
pnpm lint
pnpm build
```

## A real bug this story's own `pnpm build` caught

`exportUserData.action.ts` was missing `"use server"`. `ExportDataButton.tsx` is a
`"use client"` component that calls `exportUserDataAction()` directly (not via a `<form
action>`, since it needs the JSON response to trigger a browser download) — that specific
call pattern requires the action to carry the `"use server"` directive so Next generates a
callable client-side stub. Without it, Next inlined the whole function body, and its
transitive server-only imports (`buildContainer()` → Prisma → `pg`, `getSessionUserId()` →
`NextMdxRenderer`), directly into the client bundle, which failed with "the chunking
context does not support external modules (request: node:module)". `pnpm typecheck` and
`pnpm lint` both passed with this bug in place — only `pnpm build` catches it. Worth noting
for future work: any server action called directly from a client component (as opposed to
wrapped in an inline `"use server"` closure the way `updateBadge.action.ts` and
`updateEmailTemplate.action.ts` in this same session do) needs the directive, and `pnpm
build` is the only one of the four CI gates that actually verifies it.
