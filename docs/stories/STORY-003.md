# STORY-003 · First use case: SignUp

**Sprint:** 1
**Points:** 1
**Epic:** Auth
**Owner:** Ryan
**Dependencies:** STORY-002
**Status:** ✅ Done (shipped in initial greenfield bootstrap; `SignUp` use case lives at `src/usecases/SignUp.ts` with 16 tests)

## Goal

Write the first use case, `SignUp`, with all the SOLID discipline it needs. This story proves the pattern that every subsequent use case will follow. After this story, there is a tested, framework-independent `SignUp` orchestrator that takes injected ports and returns a `Result<SignUpOutput, SignUpError>`.

## Acceptance criteria

- [ ] `src/domain/auth/password.ts` exports `validatePassword(plain: string): Result<true, string[]>` with the documented rules (10+ chars, mixed case, one digit, one symbol).
- [ ] `src/usecases/auth/SignUp.ts` exports the `SignUp` class, the `SignUpInput` / `SignUpOutput` / `SignUpError` types, and the `SignUpInputSchema` Zod schema.
- [ ] Constructor takes a `deps` object containing the injected ports.
- [ ] `exec(input)` validates input with Zod, rate-limits by IP, validates password strength, checks for email-taken, creates the user, sends the verification email, and returns `Result<SignUpOutput, SignUpError>`.
- [ ] The use case imports nothing from `next`, `@prisma/client`, `paymongo`, `resend`, `@sentry/*`, `server-only`. ESLint clean.
- [ ] `src/usecases/auth/__tests__/SignUp.test.ts` covers: happy path, email-taken, rate-limited, weak-password, validation-failed.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green.

## Files touched

| File | Action |
|------|--------|
| `src/domain/auth/password.ts` | Create |
| `src/usecases/auth/SignUp.ts` | Create |
| `src/usecases/auth/__tests__/SignUp.test.ts` | Create |

## Code shape

See `docs/sprint-1/PLAN.md` §"STORY-003" for the full code shape. Key signatures:

```ts
// src/usecases/auth/SignUp.ts
export const SignUpInputSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(10).max(200),
  displayName: z.string().min(2).max(50),
  ip: z.string(),
});

export type SignUpInput = z.infer<typeof SignUpInputSchema>;

export type SignUpOutput = { user: User; verificationLink: string };

export type SignUpError =
  | { kind: "email_taken" }
  | { kind: "validation_failed"; issues: z.ZodIssue[] }
  | { kind: "rate_limited"; resetAt: Date }
  | { kind: "weak_password"; reasons: string[] };

export class SignUp {
  constructor(private deps: {
    users: UserRepository;
    email: EmailSender;
    rateLimiter: RateLimiter;
    clock: Clock;
    ids: IdGenerator;
    logger: Logger;
    emailVerificationSecret: string;
  }) {}
  async exec(input: SignUpInput): Promise<Result<SignUpOutput, SignUpError>>;
}
```

## Pitfalls

- **ESLint boundary rule.** If you import `argon2` or `bcrypt` or any password hasher here, the rule blocks it. Password hashing is an adapter concern (STORY-006). For STORY-003, leave a `TODO: hash via Argon2PasswordHasher (STORY-006)` and either: (a) skip hashing in the test, or (b) use a stub `hashPassword` that returns a fixed string. Option (b) keeps the use case shape stable. STORY-006 will replace it with the real adapter.
- **`Result.err({ kind: "..." })` — error shapes are discriminated unions.** ESLint rule `local/no-unmapped-error-kind` will fail the build if a `kind` value isn't in the `SignUpError` union AND the consumer mapping.
- **The `EmailSender.sendVerificationEmail` call does not block the response.** Log the error but don't fail signup. The user can resend.
- **`validatePassword` is a pure function** in `src/domain/auth/`. It does not import anything from `infra/`. It returns `Result<true, string[]>` with the list of reasons ("too short", "no uppercase", etc.).
- **Rate limiting comes before password validation.** A malicious client should not be able to enumerate weak passwords by sending thousands of attempts; the IP-based rate limit fires first.
- **`users.create` requires `actorId`.** For system-created rows (signup), pass `null`.

## Verification

```bash
pnpm test -- SignUp
# Asserts all 5 tests pass
```

The test file uses `buildTestContainer()` with explicit overrides for the ports that matter to `SignUp`. The `email` and `rateLimiter` are `vi.fn()` mocks that return `Result.ok` by default, with a way to flip them to return `Result.err` for the error tests.

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] `SignUp.exec` covered by 5+ tests: happy, email-taken, rate-limited, weak-password, validation-failed.
- [ ] Use case imports nothing from forbidden paths. ESLint clean.
- [ ] `pnpm typecheck && pnpm lint && pnpm test` all green.
- [ ] `docs/stories/STORY-003.md` exists (this file).
- [ ] Conventional commit: `feat(auth): SignUp use case (STORY-003)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated.
