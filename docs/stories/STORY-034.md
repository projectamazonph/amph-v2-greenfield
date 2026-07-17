# STORY-034 — Fix Pre-Existing TypeScript Errors

## Status

- **Story**: STORY-034
- **Sprint**: 8 — Maintenance / Tech Debt
- **Points**: 1
- **Status**: In Progress

## Overview

48 TypeScript compilation errors have accumulated on `main` across
`AwardXP.ts`, `RecordStreakVisit.ts`, `PrismaXPEventRepository.ts`, and
their associated test files. The errors are real — the code is broken.
This story fixes all of them.

These are all **stale test / wiring mismatches**: interfaces were
updated (e.g. `UserRepository` gained `updateTotalXp`, `XPEventError`
gained `db_error` variants) but the code that uses those interfaces
was not updated.

## Root Causes

### 1. `XPEventError` missing `db_error` variant

`PrismaXPEventRepository` catches DB errors and returns
`Result.err({ kind: "db_error", message: String(err) })`, but the
`XPEventError` union type in `src/domain/entities/XPEvent.ts` does not
include `db_error`. The result type `Result<XPEvent, XPEventError>`
cannot accept an error that isn't in the union → 2 TS errors.

**Fix**: Add `| { kind: "db_error"; message: string }` to `XPEventError`.

### 2. `AwardXP.ts` wrong import name

Line 15: `import type { IUserRepository }` — no such file.
The port lives at `@/ports/repositories/UserRepository.ts` and exports
`UserRepository`. The `I` prefix was never part of the naming scheme.

**Fix**: `import type { UserRepository }`.

### 3. `RecordStreakVisit.ts` wrong return type on `execute()`

The `execute()` method is declared returning `Promise<{ currentStreak,
longestStreak, milestoneHit }>` (the naked object type) but the class
returns `Result.ok(...)` and `Result.err(...)`. The declared return type
should be `Promise<RecordStreakVisitResult>`. The tests already expect
Result-style `.ok` / `.value` accessors.

**Fix**: Change the return annotation to `Promise<RecordStreakVisitResult>`.

### 4. Test stubs missing `updateTotalXp`

`UserRepository` gained `updateTotalXp(userId, newTotalXp)` after the
test stubs were written. The stubs (vi.fn() objects) are missing this
method. Files affected:

- `src/infra/access/__tests__/TierAccessPolicy.test.ts`
- `tests/unit/usecases/EnrollStudent.test.ts`
- `src/usecases/__tests__/EnrollStudent.test.ts`
- `tests/unit/usecases/AwardXP.test.ts`

**Fix**: Add `updateTotalXp: vi.fn()` to each stub object.

### 5. `AwardXP.test.ts` wrong `IUserRepository` type name

Imports `IUserRepository` from the non-existent `@/ports/repositories/IUserRepository`.
Also `makeUser()` uses non-existent User fields (`name`, `emailVerified`,
`passwordHash`, etc.) — should be `firstName`, `lastName`, `role`,
`subscriptionTier`, `verificationStatus`.

**Fix**: Import `UserRepository`; fix `makeUser()` to use correct User fields.

## Files Changed

| File                                                  | Change                                           |
| ----------------------------------------------------- | ------------------------------------------------ |
| `src/domain/entities/XPEvent.ts`                      | Add `db_error` to `XPEventError` union           |
| `src/usecases/AwardXP.ts`                             | Fix import: `IUserRepository` → `UserRepository` |
| `src/usecases/RecordStreakVisit.ts`                   | Fix `execute()` return type                      |
| `src/infra/access/__tests__/TierAccessPolicy.test.ts` | Add `updateTotalXp` to stub                      |
| `tests/unit/usecases/EnrollStudent.test.ts`           | Add `updateTotalXp` to stub                      |
| `src/usecases/__tests__/EnrollStudent.test.ts`        | Add `updateTotalXp` to stub                      |
| `tests/unit/usecases/AwardXP.test.ts`                 | Fix import + `makeUser()` fields                 |

## Verification

- `npx tsc --noEmit` → 0 TS errors
- `npx vitest run` → all existing tests still pass
- No new behaviour introduced — pure type corrections
