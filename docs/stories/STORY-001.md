# STORY-001 · Foundation: Result + Money + Clock + IdGenerator + ESLint boundary

**Sprint:** 1
**Points:** 1
**Epic:** Foundation
**Owner:** Ryan
**Dependencies:** none
**Status:** ✅ Done (shipped in initial greenfield bootstrap; see `docs/sprint-1/PLAN.md` for the commit list)

## Goal

Set up the project's TypeScript + Next.js + tooling baseline, plus the four primitives every layer depends on, plus the ESLint rule that enforces the architecture. After this story, the project is a working Next.js app that lints, typechecks, tests, and builds, with a non-trivial library of foundational code that the first use case (STORY-003) can build on.

## Acceptance criteria

- [ ] `package.json` with: Next 16, React 19, TypeScript 6.0.x strict, Prisma 7, jose, zod, argon2, vitest, playwright, eslint, eslint-plugin-boundary, pino, plus dev deps.
- [ ] `tsconfig.json` with `strict: true`, `noUncheckedIndexedAccess: true`, path aliases (`@domain/*`, `@ports/*`, `@usecases/*`, `@infra/*`, `@app/*`, `@composition/*`, `@lib/*`).
- [ ] `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts` exist and pass with no warnings.
- [ ] `src/lib/Result.ts` — `Result<T, E>` with `ok`, `err`, `map`, `flatMap`, `combine`. 100% branch coverage.
- [ ] `src/lib/Money.ts` — `Money` value object. Integer `minor`, `php()` factory, `add`/`subtract`/`multiply`/`format`/`equals`. Currency-mismatch throws. 100% branch coverage.
- [ ] `src/ports/system/Clock.ts` — interface.
- [ ] `src/ports/system/IdGenerator.ts` — interface (`new()`, `paymentRef()`, `receiptNumber()`).
- [ ] `src/infra/system/SystemClock.ts`, `UlidGenerator.ts`, `InMemoryIdGenerator.ts` — real and test impls.
- [ ] `eslint.config.mjs` boundary rule blocks `src/domain/**`, `src/ports/**`, `src/usecases/**` from importing `next/*`, `@prisma/*`, `paymongo`, `resend`, `@sentry/*`, `server-only`. A negative test (`tests/eslint-boundary.test.ts`) creates a violating file and asserts the rule fails.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all exit 0.
- [ ] `.env.example` lists `DATABASE_URL`, `JWT_SECRET`, `EMAIL_VERIFICATION_SECRET`, `PAYMONGO_SECRET`, `PAYMONGO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `SENTRY_DSN`.
- [ ] `.gitignore` excludes `node_modules`, `.next`, `.env*` (except `.env.example`), `coverage/`, `playwright-report/`, `test-results/`.

## Files touched

| File | Action |
|------|--------|
| `package.json` | Create |
| `pnpm-lock.yaml` | Create |
| `tsconfig.json` | Create |
| `next.config.ts` | Create |
| `eslint.config.mjs` | Create |
| `vitest.config.ts` | Create |
| `playwright.config.ts` | Create |
| `.env.example` | Create |
| `.gitignore` | Create |
| `src/lib/Result.ts` | Create |
| `src/lib/Money.ts` | Create |
| `src/ports/system/Clock.ts` | Create |
| `src/ports/system/IdGenerator.ts` | Create |
| `src/infra/system/SystemClock.ts` | Create |
| `src/infra/system/UlidGenerator.ts` | Create |
| `src/infra/system/InMemoryIdGenerator.ts` | Create |
| `src/lib/__tests__/Result.test.ts` | Create |
| `src/lib/__tests__/Money.test.ts` | Create |
| `src/infra/system/__tests__/SystemClock.test.ts` | Create |
| `src/infra/system/__tests__/UlidGenerator.test.ts` | Create |
| `src/infra/system/__tests__/InMemoryIdGenerator.test.ts` | Create |
| `tests/eslint-boundary.test.ts` | Create |

## Code shape

See `docs/sprint-1/PLAN.md` §"STORY-001" for the full code shapes. Key signatures:

```ts
// src/lib/Result.ts
export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const Result = {
  ok: <T>(value: T) => ({ ok: true as const, value }),
  err: <E>(error: E) => ({ ok: false as const, error }),
  map: <T, U, E>(r: Result<T, E>, f: (t: T) => U): Result<U, E>,
  flatMap: <T, U, E>(r: Result<T, E>, f: (t: T) => Result<U, E>): Result<U, E>,
  combine: <E, T extends readonly Result<unknown, E>[]>(...rs: T): Result<unknown[], E>,
};

// src/lib/Money.ts
export class Money {
  static of(minor: number, currency: Currency): Money;
  static php(pesos: number): Money;
  add(other: Money): Money;
  subtract(other: Money): Money;
  multiply(n: number): Money;
  format(): string;
  equals(other: Money): boolean;
}
```

## Pitfalls

- **The ESLint boundary rule must be tested.** Add a test that creates `src/domain/__boundary_test__/foo.ts` with a forbidden import and asserts ESLint fails. This is the canary that prevents the rule from being silently broken.
- **`Money.of(0, "PHP")` is valid.** Zero is a valid amount (e.g. a free tier). Don't special-case it.
- **Mixed-currency arithmetic throws.** This is intentional. `Money.php(100).add(Money.of(100, "USD"))` is a programmer error. Test it.
- **ULIDs are sortable.** `UlidGenerator.new()` returns a string. Test that two consecutive calls produce lexicographically-ordered strings.
- **`InMemoryIdGenerator` is for tests.** It should be deterministic (e.g. an incrementing counter wrapped as a ULID-shaped string) so test runs are reproducible.
- **TypeScript 6.0.x is the last JS-based compiler line.** Do not upgrade to 7.x — its `package.json` exports map does not include the JS compiler API, which `@typescript-eslint/typescript-estree` and Next's `verify-typescript-setup` both depend on. (Lesson learned in the legacy repo's hotfix.) Pin to `~6.0.3` and add a Dependabot ignore for `typescript` major bumps.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

The negative ESLint test (`tests/eslint-boundary.test.ts`) must fail when run alone, then pass when the violating file is removed. Use `vi.mock` to control the file's existence, or run a subprocess that touches the file and asserts ESLint's exit code.

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] 100% branch coverage on `src/lib/Result.ts` and `src/lib/Money.ts`.
- [ ] ESLint boundary rule is in `eslint.config.mjs` and the negative test passes.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `package.json` is reproducible.
- [ ] `docs/stories/STORY-001.md` exists (this file).
- [ ] Conventional commit: `chore(foundation): result/money/clock/ids + eslint boundary (STORY-001)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
