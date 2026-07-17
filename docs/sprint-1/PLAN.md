# Sprint 1 — Foundation + First Vertical Slice

**Date:** 2026-07-17
**Sprint:** 1 of 12
**Status:** Planned, ready to start

---

## Sprint Goal

Lay the SOLID five-layer architecture. Ship one working vertical slice — signup → email verification → empty dashboard — with all the infrastructure it needs: ESLint boundary rules, `Result` type, `Money`, `Clock`, `IdGenerator`, Prisma, the first use case, the first server action, the first page, the first tests.

After Sprint 1, the project is at a real vertical slice: a new user can sign up, see a "check your email" page, click the verification link, and land on an empty dashboard. The test suite proves all of it. Every subsequent sprint is "domain function + use case + adapter + page" — the same recipe.

## Why now

Every subsequent sprint is faster if the foundation is right. Adding the SOLID discipline on Sprint 5 (as the legacy repo did) is a 3-sprint refactor; adding it on Sprint 1 is a one-sprint setup cost.

The cost of skipping the foundation: every use case ends up importing `@prisma/client` directly, every payment change touches every layer, every simulator addition requires a five-file edit. The cost of doing the foundation: one sprint of mostly-infrastructure work, after which adding features is a one-domain-module + one-use-case change.

## Capacity & Velocity Context

| Sprint | Pts | Story pattern |
|--------|-----|---------------|
| **S1** | **5** | Foundation + first vertical slice (5 × 1pt) |
| S2 | 5 | Auth (5 × 1pt) |
| S3 | 5 | Catalog + content (5 × 1pt) |
| ... | ... | ... |

Recent trend: this is the first sprint, no trend to compare. The 5-point budget is honest about the work.

---

## Stories (5 × 1pt = 5pts)

| ID | Title | Pts | Status |
|----|-------|-----|--------|
| STORY-001 | Foundation: `Result` + `Money` + `Clock` + `IdGenerator` + ESLint boundary | 1 | Planned |
| STORY-002 | Prisma schema + first repository (`UserRepository` + `InMemoryUserRepository`) | 1 | Planned |
| STORY-003 | First use case: `SignUp` | 1 | Planned |
| STORY-004 | First server action + first page: signup form | 1 | Planned |
| STORY-005 | First end-to-end test: Playwright signup happy path | 1 | Planned |

---

## Story Detail

### STORY-001 — Foundation

**Goal:** Set up the project's TypeScript + Next.js + tooling baseline, plus the four primitives every layer depends on, plus the ESLint rule that enforces the architecture.

**Files touched (new):**

| File | Action |
|------|--------|
| `package.json` | Create — Next 16, React 19, TypeScript strict, Prisma 7, jose, zod, argon2, vitest, playwright, eslint, eslint-plugin-boundary, pino |
| `pnpm-lock.yaml` | Create |
| `tsconfig.json` | Create — strict, `noUncheckedIndexedAccess`, path aliases (`@domain/*`, `@ports/*`, `@usecases/*`, `@infra/*`, `@app/*`, `@composition/*`, `@lib/*`) |
| `next.config.ts` | Create |
| `eslint.config.mjs` | Create — boundary rules: `src/domain/**`, `src/ports/**`, `src/usecases/**` cannot import from `next/*`, `@prisma/*`, `paymongo`, `resend`, `@sentry/*`, `server-only` |
| `vitest.config.ts` | Create |
| `playwright.config.ts` | Create |
| `src/lib/Result.ts` | Create — `Result<T, E>` + `Result.{ok, err, map, flatMap, combine}` |
| `src/lib/Money.ts` | Create — integer minor, `php()`, `add`, `subtract`, `multiply`, `format` |
| `src/ports/system/Clock.ts` | Create |
| `src/ports/system/IdGenerator.ts` | Create |
| `src/infra/system/SystemClock.ts` | Create |
| `src/infra/system/UlidGenerator.ts` | Create |
| `src/infra/system/InMemoryIdGenerator.ts` | Create — deterministic for tests |
| `src/lib/__tests__/Result.test.ts` | Create — 100% branch coverage |
| `src/lib/__tests__/Money.test.ts` | Create — 100% branch coverage, including currency mismatch throw |
| `src/infra/system/__tests__/SystemClock.test.ts` | Create |
| `src/infra/system/__tests__/UlidGenerator.test.ts` | Create |
| `src/infra/system/__tests__/InMemoryIdGenerator.test.ts` | Create |
| `.env.example` | Create — `DATABASE_URL`, `JWT_SECRET`, etc. |
| `.gitignore` | Create |
| `README.md`, `AGENTS.md`, `CLAUDE.md`, `FEATURES.md`, `CHANGELOG.md`, `SESSION-HANDOVER.md` | Already exist from docs sprint. Update CHANGELOG with Sprint 1 start. |

**Code shape (`src/lib/Money.ts`):**

```ts
export type Currency = "PHP" | "USD";

export class Money {
  private constructor(
    public readonly minor: number,
    public readonly currency: Currency,
  ) {}
  static of(minor: number, currency: Currency): Money {
    if (!Number.isInteger(minor)) throw new Error("Money.minor must be integer");
    return new Money(minor, currency);
  }
  static php(pesos: number): Money {
    return Money.of(Math.round(pesos * 100), "PHP");
  }
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.minor + other.minor, this.currency);
  }
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.of(this.minor - other.minor, this.currency);
  }
  multiply(n: number): Money {
    return Money.of(Math.round(this.minor * n), this.currency);
  }
  isPositive(): boolean { return this.minor > 0; }
  format(): string {
    return new Intl.NumberFormat("en-PH", { style: "currency", currency: this.currency })
      .format(this.minor / 100);
  }
  equals(other: Money): boolean {
    return this.minor === other.minor && this.currency === other.currency;
  }
  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}
```

**Pitfalls:**

- The ESLint boundary rule must be tested. Add a `tests/eslint-boundary.test.ts` that creates a `src/domain/foo.ts` that imports from `@prisma/client` and asserts the rule fails.
- `Money.of(0, "PHP")` should not throw. Zero is a valid amount.
- `Money` arithmetic with mixed currencies throws. This is intentional, not a bug. Test it.
- `UlidGenerator` should produce sortable IDs. Test that.

**Verification:**

```bash
pnpm install
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

**DoD:**

- [ ] All files in "Files touched (new)" are present.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] 100% branch coverage on `src/lib/Result.ts` and `src/lib/Money.ts`.
- [ ] ESLint boundary rule is in `eslint.config.mjs` and the negative test passes.
- [ ] `package.json` is reproducible (`pnpm install --frozen-lockfile` works).
- [ ] `docs/stories/STORY-001.md` exists.
- [ ] Conventional commit: `chore(foundation): Sprint 1 STORY-001 result/money/clock/ids + eslint boundary (STORY-001)`.
- [ ] `SESSION-HANDOVER.md` updated.

### STORY-002 — Prisma schema + first repository

**Goal:** Set up Prisma 7 with the `User` model, create the `UserRepository` port, implement `PrismaUserRepository` and `InMemoryUserRepository`.

**Files touched (new):**

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Create — `User` model (per `docs/db-schema.md` §"User") |
| `src/domain/users/User.ts` | Create — entity with `reconstitute(row)` |
| `src/ports/repositories/UserRepository.ts` | Create — interface with `findById`, `findByEmail`, `create`, `update`, `recordStreakVisit`, `list` |
| `src/infra/db/prisma/PrismaUserRepository.ts` | Create — implements `UserRepository`, maps to/from `User` domain entity |
| `src/infra/db/prisma/client.ts` | Create — singleton `PrismaClient` |
| `src/infra/db/inmemory/InMemoryUserRepository.ts` | Create — same surface, in-memory |
| `prisma/migrations/0001_init/migration.sql` | Create — generated by `prisma migrate dev` |
| `src/domain/users/__tests__/User.test.ts` | Create |
| `src/infra/db/prisma/__tests__/PrismaUserRepository.test.ts` | Create — integration test against a real Postgres (CI service container) |
| `src/infra/db/inmemory/__tests__/InMemoryUserRepository.test.ts` | Create — assert the fake matches the port contract |
| `src/composition/testContainer.ts` | Create — `buildTestContainer(overrides?)` returns a container with `InMemoryUserRepository` and fakes for everything else |

**Code shape (`src/ports/repositories/UserRepository.ts`):**

```ts
import type { User } from "@domain/users/User";

export type NewUser = {
  email: string;
  passwordHash: string;
  displayName: string;
};

export type UserPatch = Partial<Pick<User, "displayName" | "passwordHash" | "emailVerifiedAt">>;

export type UserListQuery = {
  search?: string;
  role?: User["role"];
  status?: "active" | "deleted";
  page: number;
  pageSize: number;
};

export type UserListResult = {
  rows: User[];
  total: number;
};

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(input: NewUser, actorId: string | null): Promise<User>;
  update(id: string, patch: UserPatch, actorId: string | null): Promise<User>;
  recordStreakVisit(id: string, today: Date): Promise<{ current: number; longest: number; changed: boolean }>;
  list(query: UserListQuery): Promise<UserListResult>;
}
```

**Pitfalls:**

- `PrismaUserRepository` must not leak Prisma types. The `User` domain entity is what crosses the boundary.
- The mappers (`toDomain`, `toWriteInput`) are the only place that knows both shapes. If you find yourself importing `@prisma/client` types in `domain/`, refactor.
- `InMemoryUserRepository` must implement the full surface, including `list` with `total`. Don't lazy-implement.
- `buildTestContainer()` returns a container with all ports stubbed. Even if only `users` is used by the test, the rest of the ports are present (as `vi.fn()`-style no-op fakes or simple in-memory impls) so the container type checks.

**Verification:**

```bash
pnpm prisma:generate
pnpm prisma:migrate
DATABASE_URL=postgresql://... pnpm test
```

**DoD:**

- [ ] All files in "Files touched (new)" are present.
- [ ] `User` domain entity has `reconstitute(row)` and a constructor with validation.
- [ ] `PrismaUserRepository` has no `console.log`, no `any`, and no Prisma types in the public signatures.
- [ ] `InMemoryUserRepository` has a test that exercises every method, including edge cases (empty list, page boundaries, role filter).
- [ ] `buildTestContainer()` is exported and typed.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green.
- [ ] `docs/stories/STORY-002.md` exists.
- [ ] Conventional commit: `feat(users): user model + repository port + prisma + inmemory impls (STORY-002)`.

### STORY-003 — First use case: `SignUp`

**Goal:** Write the first use case, with all the SOLID discipline it needs. This story proves the pattern that every subsequent use case will follow.

**Files touched (new):**

| File | Action |
|------|--------|
| `src/domain/users/errors.ts` | Create — `EmailTakenError`, `WeakPasswordError`, `RateLimitedError`, etc. |
| `src/domain/auth/password.ts` | Create — pure `validatePassword(plain): { ok, reasons[] }` |
| `src/usecases/auth/SignUp.ts` | Create — `SignUp` class with constructor-injected ports |
| `src/usecases/auth/__tests__/SignUp.test.ts` | Create — uses `buildTestContainer`, covers happy + every error + rate-limit + email-taken |

**Code shape (`src/usecases/auth/SignUp.ts`):**

```ts
import { z } from "zod";
import type { UserRepository } from "@ports/repositories/UserRepository";
import type { EmailSender } from "@ports/gateways/EmailSender";
import type { RateLimiter } from "@ports/services/RateLimiter";
import type { Clock } from "@ports/system/Clock";
import type { IdGenerator } from "@ports/system/IdGenerator";
import type { Logger } from "@ports/system/Logger";
import type { User } from "@domain/users/User";
import { validatePassword } from "@domain/auth/password";
import { Result } from "@lib/Result";

export const SignUpInputSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(200),
  displayName: z.string().min(2).max(50),
  ip: z.string(),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export type SignUpOutput = {
  user: User;
  verificationLink: string;  // for tests; production sends via email
};

export type SignUpError =
  | { kind: "email_taken" }
  | { kind: "validation_failed"; issues: z.ZodIssue[] }
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "weak_password"; reasons: string[] };

export class SignUp {
  constructor(
    private deps: {
      users: UserRepository;
      email: EmailSender;
      rateLimiter: RateLimiter;
      clock: Clock;
      ids: IdGenerator;
      logger: Logger;
      emailVerificationSecret: string;  // for the verification link
    },
  ) {}

  async exec(input: SignUpInput): Promise<Result<SignUpOutput, SignUpError>> {
    const parsed = SignUpInputSchema.safeParse(input);
    if (!parsed.success) {
      return Result.err({ kind: "validation_failed", issues: parsed.error.issues });
    }
    const data = parsed.data;

    const rl = await this.deps.rateLimiter.check("signup_per_ip", data.ip);
    if (!rl.ok) return Result.err(rl.error);
    if (rl.value.remaining === 0) {
      return Result.err({ kind: "rate_limited", resetAt: rl.value.resetAt });
    }

    const pw = validatePassword(data.password);
    if (!pw.ok) return Result.err({ kind: "weak_password", reasons: pw.error });

    const existing = await this.deps.users.findByEmail(data.email);
    if (existing) return Result.err({ kind: "email_taken" });

    const passwordHash = await hashPassword(data.password);  // argon2id
    const user = await this.deps.users.create(
      { email: data.email, passwordHash, displayName: data.displayName },
      null,  // system
    );

    const token = this.deps.ids.new();
    const verificationLink = `https://app.example.com/verify?token=${token}`;
    const emailResult = await this.deps.email.sendVerificationEmail(user, verificationLink);
    if (!emailResult.ok) {
      this.deps.logger.error("signup.verification_email_failed", { userId: user.id });
    }

    return Result.ok({ user, verificationLink });
  }
}

async function hashPassword(plain: string): Promise<string> {
  // argon2id wrapper lives in src/infra/auth/Argon2PasswordHasher.ts
  // (not yet created in this story; will be created as part of the use case's adapter wiring)
  throw new Error("not implemented in STORY-003; see STORY-006");
}
```

(For STORY-003, the password hash is a stub. STORY-006 introduces `Argon2PasswordHasher` as a real port + adapter. The use case shape stays the same.)

**Pitfalls:**

- The use case does not import `@prisma/client`, `next`, `paymongo`, `resend`, or `argon2`. ESLint boundary rule will fail the build if it does.
- `Result.err({ kind: "..." })` — error shapes are discriminated unions. ESLint will fail the build if a `kind` value isn't in the type.
- The password hash is async. Don't block the event loop.
- The `EmailSender.sendVerificationEmail` call does not block the user response. The use case logs the error but does not fail signup if the email fails (the user can resend).
- Tests use `buildTestContainer()` with explicit overrides. No mocking the real Prisma.

**Verification:**

```bash
pnpm test
# Asserts:
# - happy path: result.ok, user created, email queued
# - email taken: result.err({ kind: "email_taken" })
# - rate limited: result.err({ kind: "rate_limited" })
# - weak password: result.err({ kind: "weak_password" })
# - validation failed: result.err({ kind: "validation_failed" })
```

**DoD:**

- [ ] All files in "Files touched (new)" are present.
- [ ] `SignUp.exec` covered by 5+ tests: happy, email-taken, rate-limited, weak-password, validation-failed.
- [ ] Use case imports nothing from `next`, `prisma`, `paymongo`, `resend`, `@sentry/*`. ESLint clean.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green.
- [ ] `docs/stories/STORY-003.md` exists.
- [ ] Conventional commit: `feat(auth): SignUp use case (STORY-003)`.

### STORY-004 — First server action + first page

**Goal:** Expose the `SignUp` use case as a server action, and build the signup form page. This is the first end-user touchpoint.

**Files touched (new):**

| File | Action |
|------|--------|
| `src/app/layout.tsx` | Create — root layout, fonts (Space Grotesk + JetBrains Mono), base CSS |
| `src/app/page.tsx` | Create — landing page (placeholder content, real copy in Sprint 3) |
| `src/app/(auth)/layout.tsx` | Create — auth-section layout, no sidebar |
| `src/app/(auth)/signup/page.tsx` | Create — signup form (RSC shell + client form component) |
| `src/app/(auth)/signup/SignupForm.tsx` | Create — `'use client'` form with Zod validation, error display |
| `src/app/actions/auth.ts` | Create — `signUpAction(formData)` |
| `src/app/(auth)/signup/sent/page.tsx` | Create — "check your email" page |
| `src/composition/container.ts` | Create — `buildContainer()` with real adapters |
| `src/composition/requestContainer.ts` | Create — `AsyncLocalStorage` wrapper |
| `src/middleware.ts` | Create — minimal middleware, sets up the request container |

**Code shape (`src/app/actions/auth.ts`):**

```ts
"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { container } from "@composition/requestContainer";
import { SignUp } from "@usecases/auth/SignUp";

const FormSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(200),
  displayName: z.string().min(2).max(50),
});

export type SignUpActionResult =
  | { ok: true; userId: string }
  | { ok: false; error: { kind: "validation_failed"; issues: z.ZodIssue[] } | { kind: "email_taken" } | { kind: "weak_password"; reasons: string[] } | { kind: "rate_limited"; resetAt: string } | { kind: "internal" } };

export async function signUpAction(formData: FormData): Promise<SignUpActionResult> {
  const ip = formData.get("ip") as string | null ?? "0.0.0.0";
  const parsed = FormSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: { kind: "validation_failed", issues: parsed.error.issues } };
  }

  const c = container.get();
  const result = await new SignUp({
    users: c.users,
    email: c.email,
    rateLimiter: c.rateLimiter,
    clock: c.clock,
    ids: c.ids,
    logger: c.logger,
    emailVerificationSecret: process.env.EMAIL_VERIFICATION_SECRET!,
  }).exec({ ...parsed.data, ip });

  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  redirect("/signup/sent");
}
```

**Code shape (`src/app/(auth)/signup/SignupForm.tsx`):**

```tsx
"use client";

import { useState, useTransition } from "react";
import { signUpAction } from "@/app/actions/auth";

export function SignupForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await signUpAction(formData);
      if (result && !result.ok) {
        setError(renderError(result.error));
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="signup-form">
      {/* email, password, displayName inputs with Field Manual styling */}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating account..." : "Create account"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </form>
  );
}

function renderError(error: SignUpActionResult["error"]): string {
  switch (error.kind) {
    case "email_taken": return "An account with this email already exists.";
    case "validation_failed": return "Please check the form for errors.";
    case "weak_password": return "Password is too weak. " + error.reasons.join(" ");
    case "rate_limited": return "Too many signups. Try again later.";
    case "internal": return "Something went wrong. Please try again.";
  }
}
```

**Pitfalls:**

- The server action redirects on success. The client doesn't get to render a success state; Next.js handles the redirect. The form's `useTransition` is for the in-flight state.
- The form component is `'use client'` for the form state. The page itself is RSC.
- `redirect()` from `next/navigation` throws a special error. It must be called outside of any `try/catch` that swallows errors. Keep it as the last line of the action.
- The `ip` field is a stub for STORY-004 (Next.js will provide real IP in middleware in Sprint 2 / STORY-009).
- The form is mobile-first responsive at 390px. The layout is the Field Manual direction.

**Verification:**

```bash
pnpm dev
# Open http://localhost:3000/signup
# Fill in the form, submit
# Should redirect to /signup/sent
# Check the database: User row exists, passwordHash is argon2id
# Check the email queue: verification email is queued (or, in dev, logged to console)
```

**DoD:**

- [ ] All files in "Files touched (new)" are present.
- [ ] `signUpAction` returns the documented discriminated union.
- [ ] `redirect()` is the last line of the action on success.
- [ ] The form is mobile-first responsive (test at 390px).
- [ ] Manual smoke: signup flow works end-to-end.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
- [ ] `docs/stories/STORY-004.md` exists.
- [ ] Conventional commit: `feat(auth): signup server action + signup page (STORY-004)`.

### STORY-005 — First end-to-end test

**Goal:** Playwright test that signs up, asserts the redirect, asserts the User row exists in the test database.

**Files touched (new):**

| File | Action |
|------|--------|
| `tests/e2e/auth/signup.spec.ts` | Create — Playwright test |
| `tests/e2e/helpers/db.ts` | Create — `getTestUser(email)`, `deleteTestUser(email)` |
| `playwright.config.ts` | Modify — add `webServer` config, base URL, test directory |

**Code shape (`tests/e2e/auth/signup.spec.ts`):**

```ts
import { test, expect } from "@playwright/test";
import { getTestUser, deleteTestUser } from "../helpers/db";

test.describe("signup", () => {
  test("happy path: user can sign up and lands on the check-your-email page", async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await deleteTestUser(email);

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple-9!");
    await page.getByLabel("Display name").fill("Test User");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL("/signup/sent");
    await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

    // Assert the user was created in the database
    const user = await getTestUser(email);
    expect(user).not.toBeNull();
    expect(user!.emailVerifiedAt).toBeNull();
  });

  test("email taken: shows an error and does not create a duplicate", async ({ page }) => {
    // ... (covers the "An account with this email already exists." path)
  });

  test("weak password: shows the password strength reasons", async ({ page }) => {
    // ...
  });
});
```

**Pitfalls:**

- The test database is a separate Postgres schema. The Playwright config sets `DATABASE_URL` to a test-only database. `deleteTestUser` is destructive but scoped to the test email.
- `getByLabel` requires `<label htmlFor>` on the inputs. Don't use placeholder-as-label.
- The test must be idempotent: delete the test user before and after, so re-runs are clean.
- The test runs against the real dev build (`pnpm build && pnpm start`), not the dev server, to match production behavior.

**Verification:**

```bash
pnpm test:e2e
# Asserts all 3 tests pass
```

**DoD:**

- [ ] All files in "Files touched (new)" are present.
- [ ] At least 3 E2E tests: happy path, email-taken, weak-password.
- [ ] `pnpm test:e2e` all green.
- [ ] CI workflow updated to run `pnpm test:e2e` on every PR.
- [ ] `docs/stories/STORY-005.md` exists.
- [ ] Conventional commit: `test(e2e): signup flow playwright tests (STORY-005)`.

---

## Sprint 1 Order of Operations (Handoff Preview)

1. `pnpm create next-app` with the documented options. Trim the boilerplate.
2. `pnpm add` all the dependencies. Commit `package.json` + `pnpm-lock.yaml` separately.
3. STORY-001: foundation. Land it. `pnpm typecheck && pnpm lint && pnpm test && pnpm build` all green.
4. STORY-002: schema + repos. Land it. Integration test against a real Postgres.
5. STORY-003: `SignUp` use case. Land it. Unit tests with `buildTestContainer`.
6. STORY-004: server action + page. Land it. Manual smoke.
7. STORY-005: E2E. Land it. CI green.
8. Update `SESSION-HANDOVER.md` with Sprint 1 closing notes. Add `docs/sprint-2/PLAN.md` (or at least draft it).
9. Memoria T1 semantic memory stored.
10. Git commit on `main` with the SHA recorded in `SESSION-HANDOVER.md`.

## Sprint 2 Order of Operations (Handoff Preview)

1. `pnpm typecheck && pnpm lint && pnpm test` — confirm Sprint 1 left a clean baseline.
2. STORY-006: SignIn + SignOut + JWT cookie. Real `Argon2PasswordHasher` adapter.
3. STORY-007: Email verification (the link the user got in STORY-004 finally works).
4. STORY-008: Password reset.
5. STORY-009: Middleware: request container + auth gate. Every page is now auth-aware.
6. STORY-010: Auth unit + integration tests. Every use case in `src/usecases/auth/` is tested.

---

## Commands

```bash
# One-time setup
pnpm install
pnpm prisma:generate
pnpm prisma:migrate

# Develop
pnpm dev

# Quality gates
pnpm typecheck
pnpm lint
pnpm test
pnpm test:coverage
pnpm test:e2e

# Build
pnpm build
pnpm start
```

## Definition of Done (Sprint 1)

- [ ] All 5 stories merged.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:coverage && pnpm test:e2e && pnpm build` all green.
- [ ] `docs/sprint-2/PLAN.md` exists.
- [ ] `SESSION-HANDOVER.md` updated with Sprint 1 closing notes.
- [ ] Memoria T1 semantic memory stored.
- [ ] Demo: walk through `docs/sprint-1/DEMO.md` (created during the sprint) — signup → check-email page → empty dashboard. Even if the dashboard is just "Welcome, [name]", the loop is closed.
