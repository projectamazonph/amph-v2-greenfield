# TDD and SOLID Codebase Review

**Date:** 2026-07-19  
**Repository:** `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield`

## Scope

This review checks the current codebase against the project’s stated TDD and SOLID rules in:

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/AGENTS.md`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/CLAUDE.md`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/docs/build-spec.md`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/OPERATING_GUIDELINES.md`

## Validation snapshot

- `pnpm prisma generate` ✅
- `pnpm typecheck` ✅
- `pnpm test:arch` ✅ (`397` passing architecture tests)
- `pnpm lint` ⚠️ warnings only
- `pnpm test` ⚠️ `177` files passed, `4` suites failed because `DATABASE_URL` is required at import time
- `pnpm build` ⚠️ failed in sandbox because Next.js could not fetch Google Fonts

## What is already strong

1. **TDD presence is real.** `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/architecture/use-case-coverage.test.ts` and `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/architecture/entity-coverage.test.ts` both pass, so every use case and every domain entity currently has at least one test file.
2. **Layering guards are active.** `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/architecture/dependency-direction.test.ts`, `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/architecture/dependency-inversion.test.ts`, and `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/architecture/domain-purity.test.ts` all pass.
3. **The review docs are not fiction.** The architecture suite is wired into CI at `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/.github/workflows/ci.yml:77`.

## Verified TDD gaps

### 1. Full test runs are not hermetic

`/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/infra/database/prisma.ts:22-38` throws immediately when `DATABASE_URL` is missing, and `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/composition/container.ts` imports that singleton at module load. In practice this makes these suites fail before their tests run:

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/lib/__tests__/auth.test.ts`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/app/actions/__tests__/login.action.test.ts`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/app/actions/__tests__/revokeCertificate.action.test.ts`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/app/actions/__tests__/signup.action.test.ts`

This is a testability gap. The architecture tests pass, but the full test suite still depends on process-level environment setup instead of isolating those units.

### 2. Some fire-and-forget error paths are still untested

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/MarkLessonComplete.ts:179-195` creates and runs `AwardXP` in a private helper, but `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/unit/usecases/MarkLessonComplete.test.ts:353-372` ends without any failure-path coverage for that XP side effect.
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/RecordStreakVisit.ts:100-110` swallows milestone XP failures, but `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/tests/unit/usecases/RecordStreakVisit.test.ts:200-222` covers only repository failure, not XP-award failure.

The codebase meets the “every use case has a test file” rule, but not every high-risk branch has a direct regression test.

## Verified SOLID violations or drifts

### 1. Ports layer contains concrete implementation code

`/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/system/Clock.ts:19-30` defines both the `Clock` interface and the concrete `SystemClock` class in the ports layer. That conflicts with the stated rule that `/src/ports` contains interfaces only.

### 2. Port contract is inconsistent across the codebase

The docs repeatedly state that every port method returns `Promise<Result<T, E>>`, but several ports return raw values or throw-oriented APIs instead:

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/repositories/IEnrollmentRepository.ts:17-30`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/repositories/IDiscountCodeRepository.ts:19-37`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/access/IAccessPolicy.ts:11-18`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/payment/IPaymentGateway.ts:44-50`

This is not just documentation drift. It leaks into production code and weakens the “typed errors across boundaries” rule.

### 3. Webhook signature verification bypasses the payment port

`/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/app/api/webhooks/paymongo/route.ts:37-48` casts `container.paymentGateway` to an ad hoc shape so it can call `verifyWebhookSignature`. That is a dependency inversion leak caused by `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/ports/payment/IPaymentGateway.ts:44-50` exposing a throwing `void` method instead of a normal port result.

### 4. Use cases are creating other use cases directly

These files instantiate `AwardXP` inside the use case body instead of receiving a collaborator from the composition root:

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/MarkLessonComplete.ts:186-193`
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/RecordQuizAttempt.ts:172-185`

That creates hidden dependencies, duplicates wiring logic, and makes the side effect harder to replace or observe in tests.

### 5. Some use cases still break the “no throw across boundaries” rule

`/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/SignUp.ts:133-147` throws when password hashing fails and also performs debug logging directly inside the use case. The file header says the use case “never throws across the layer boundary”, but the implementation still can.

### 6. Production wiring still depends on multiple in-memory adapters

`/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/composition/container.ts:318-343` still wires these production dependencies to in-memory implementations:

- module repository
- lesson repository
- order repository
- discount code repository
- session repository
- audit log repository
- simulator scenario repository
- live class repository

This is already documented elsewhere, but it remains the largest architectural exception to the intended composition model.

## Additional review notes

### Lint-level SOLID/TDD smells

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/ImpersonateUser.ts:142-148` still uses `console.log` in an admin action path.
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/src/usecases/RecordAuditLog.ts:59-75` still uses `console.error`, and the current lint run reports its `eslint-disable` comments as stale.

### Documentation drift

- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/OPERATING_GUIDELINES.md:184-196` still says Tier B, Tier C, and Tier D are open.
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/SESSION-HANDOVER.md` says Tier C is closed and Tier D was removed.
- `/home/runner/work/amph-v2-greenfield/amph-v2-greenfield/docs/sprint-11/AUDIT-AND-COMPLIANCE-HANDOFF.md:14` says “All 6 P0 items closed” while the same file marks P0-2 as partial and P0-7 as open.

## Priority order

1. Make the full test suite hermetic by removing import-time `DATABASE_URL` failure from unit-test paths.
2. Normalize port contracts so ports either return `Result` consistently or the docs are narrowed to the real rule.
3. Move `SystemClock` out of `/src/ports` and keep `/src/ports` interface-only.
4. Stop constructing `AwardXP` inside other use cases. Inject a collaborator instead.
5. Add direct tests for swallowed XP-award failures in `MarkLessonComplete` and `RecordStreakVisit`.
6. Clean up stale audit documentation so the current review baseline is consistent.
