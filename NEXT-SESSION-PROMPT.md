# NEXT-SESSION-PROMPT.md

**Paste this entire file at the start of the next Mavis session.**

---

```
Repo: https://github.com/projectamazonph/amph-v2-greenfield
Branch: main (squash-only merge, branches auto-delete on merge)
Local: /workspace/amph-v2-greenfield/
Tech: Next.js 16 + React 19 + TypeScript 7 + Prisma 7 + Argon2 + Vitest + Playwright + jose + Sentry
Architecture: SOLID five-layer (domain/ → ports/ → usecases/ → infra/ → app/)

main HEAD: ee067f3
Quality gate: 0 tsc errors, 932/932 tests, build succeeds WITHOUT dummy env vars

Docs (read in this order):
  1. AGENTS.md              — six rules, voice, design system, architecture
  2. OPERATING_GUIDELINES.md — git discipline, TDD protocol, quality gate
  3. SESSION-TDD-SOLID-AUDIT.md — recent TDD+SOLID audit, what was fixed, what's still open
  4. SESSION-HANDOVER.md   — prior session handoff (sprint 8/9)
  5. BOOTSTRAP.md          — sprint status table
  6. docs/stories/         — one doc per story
```

---

## State at Session Start (CRITICAL)

**The user's rule is "we don't move a story until existing issues are addressed."**

**Tier A (production bugs):** ✅ closed in PR #66
**Tier B (TDD coverage gaps):** ❌ NOT closed
**Tier C (SOLID hygiene):** ❌ NOT closed
**Tier D (dead code):** ❌ NOT closed

### Tier B (12 use cases + 11 repos have no tests)

12 use cases with **zero tests**:
- `ApplyDiscountCode`, `AwardBadge`, `AwardXP`, `CheckCourseAccess`,
  `CreatePaymentIntent`, `IssueCertificate`, `ListUserBadges`,
  `MarkLessonComplete`, `RecordQuizAttempt`, `RecordStreakVisit`,
  `RenderCertificatePdf`, `RequestRefund`, `VerifyCertificate`

11 `InMemory*` repository adapters with **zero tests**:
- `InMemoryBadgeAwardRepository`, `InMemoryBadgeRepository`,
  `InMemoryCertificateRepository`, `InMemoryCourseRepository`,
  `InMemoryDiscountCodeRepository`, `InMemoryEnrollmentRepository`,
  `InMemoryProgressEventRepository`, `InMemoryUserRepository`,
  `InMemoryUserStreakRepository`, `InMemoryXPEventRepository`

### Tier C (SOLID hygiene)

- 8 `any` casts in `PrismaBadgeAwardRepository.ts` + `PrismaBadgeRepository.ts` + `GetAdminDashboardStats.test.ts`
- 3 unused `eslint-disable` directives in `src/app/certificates/[hash]/pdf/route.ts:45,53,69`
- Middleware → Proxy migration (Next 16 deprecation; `src/middleware.ts` → `src/proxy.ts`)

### Tier D (dead code)

3 use cases with **no callers in the app**:
- `MarkLessonComplete`, `RecordStreakVisit`, `RequestRefund`

---

## What To Do (in order)

### Step 1: Pick the lowest-effort tier first

**Recommended order:** Tier C → Tier D → Tier B (story-by-story).

Tier C is ~30 minutes of work. Tier D is 5 minutes (delete dead code).
Tier B should be done **as stories are touched** (each story's TDD cycle
covers its own use case), not as a separate bulk effort.

### Step 2: If you do Tier C+D as a single PR

Use this exact approach:

1. **Create a branch:** `git checkout -b fix/tier-c-d-cleanup`
2. **Write the tests FIRST** (TDD):
   - For the `any` casts in `PrismaBadge*Repository.ts`: write a static
     test that asserts the file no longer contains `: any[]` or `: any`
     patterns. (Real TDD: replace with proper Prisma type imports.)
   - For the unused eslint-disable: write a test that asserts ESLint
     reports 0 issues. (This is the existing ESLint config — just
     delete the comments.)
   - For Middleware → Proxy: there's no test to write; just rename the
     file and update the function signature if needed.
   - For Tier D: there's no test for "deleted code"; just delete and
     verify the build still passes.
3. **Verify each test fails (red), then implement (green), then refactor.**
4. **Quality gate:**
   ```bash
   ./node_modules/.bin/tsc --noEmit
   DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
     JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
     ./node_modules/.bin/vitest run
   rm -rf .next && DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
     JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
     ./node_modules/.bin/next build
   ./node_modules/.bin/eslint .
   ```
5. **Commit + push + PR + squash-merge + sync main + wipe PAT.**

### Step 3: For Tier B (when starting STORY-047 or similar)

When you start a story that uses an untested use case (e.g.,
`MarkLessonComplete` for STORY-047 admin users):

1. **Write the test FIRST** (TDD red).
2. **Implement** (green).
3. **Refactor** if needed.
4. The new use-case test is the closure for that Tier B item.

The TDD discipline is the same — story work IS Tier B work, just in
smaller increments per story.

---

## Hard Rules (Reaffirmed in This Session)

1. **Strict TDD:** Write the test FIRST. Watch it fail. Then implement.
2. **Strict SOLID:** All data access goes through `buildContainer()`. No
   `new InMemory*()` in production code. No hand-rolled JWT verification
   outside `src/lib/auth.ts`. No module-load env capture (per-call reads).
3. **Composition root is sacred:** The prod container is the single
   source of truth for which adapters are wired. Don't bypass it.
4. **Static-analysis regression guards** for cases where the unit-test
   surface is limited (async server components, framework glue).
5. **One branch per fix/feature, one PR per branch, squash-merge.**
6. **No direct push to main** (it's protected by GH repo rules).
7. **PAT in env, not in shell history.** `unset GITHUB_TOKEN_PAT`
   after every merge.

---

## Patterns Established This Session (Reuse These)

### Pure-helper + thin-shell (server actions)

```ts
// src/app/actions/<name>.action.ts
export async function performX(
  container: { ... },
  input: XInput,
  deps: { plantCookie: ...; navigate: ... },
): Promise<XResult> {
  // Pure logic. Testable without Next.
}

export async function xAction(_prev: XState, formData: FormData): Promise<XState> {
  // 3-line thin shell. Wires container + side-effect deps.
}
```

### Static-analysis regression guard

```ts
it("does NOT use InMemory* directly", async () => {
  const source = await fs.readFile(sourcePath, "utf8");
  expect(source).not.toMatch(/new\s+InMemory/);
});
```

### Lazy initialization for env-dependent adapters

```ts
constructor(apiKey: string) {
  this.apiKey = apiKey;  // Just store. Don't validate.
}
private getClient(): Client | null {
  if (this.client) return this.client;
  if (!this.apiKey) return null;
  this.client = new Client(this.apiKey);
  return this.client;
}
```

---

## TDD Discipline — The Mental Model

When picking up any task, ask these in order:

1. **What does the contract say?** (input shape, output shape, error variants)
2. **What's the test that locks in the contract?** (red)
3. **What's the minimum code to make the test pass?** (green)
4. **Does the test catch the bug we're trying to prevent?** (verify)
5. **Is the code SOLID?** (refactor — no God objects, no layer violations,
   no framework deps in `domain/` or `ports/`)

If a task has no test surface (e.g., a pure CSS file), use the
**static-analysis regression guard** pattern.

---

## Disclaimers (Read Before You Start)

1. **Build requires `RESEND_API_KEY`?** No, the lazy-init fix means the
   build succeeds without it. If you see "Missing API key" errors, the
   lazy-init was reverted. Check `src/infra/email/ResendEmailSender.ts`.
2. **`/courses` is a static page (`○`)** — it builds via the prod
   container. If you see "Courses coming soon" or 404s, the
   `buildContainer()` calls were reverted in `src/app/courses/page.tsx`
   and `src/app/courses/[slug]/page.tsx`.
3. **`InMemorySessionRepository` is intentional in prod** (documented
   in `src/composition/container.ts`). Don't "fix" it — the JWT is
   stateless and the DB row loss on restart doesn't invalidate sessions.
4. **The container pattern is the only data-access path.** If a page
   imports `@/infra/repositories/InMemory*` directly, that's a Tier A
   bug — fix it via the static-analysis regression guard pattern.

---

## Quality Gate Command (Run Before Every Commit)

```bash
cd /workspace/amph-v2-greenfield
./node_modules/.bin/tsc --noEmit
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
./node_modules/.bin/vitest run
rm -rf .next && \
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-must-be-at-least-32-bytes-long-ok" \
./node_modules/.bin/next build
./node_modules/.bin/eslint .
```

**All four must be clean.** A passing test suite with tsc errors is not
ready to push.

---

## After This Session, the New Defaults Are

- **New actions**: pure-helper + thin-shell, no `new InMemory*` imports
- **New pages**: use `buildContainer()` for data access
- **New tests**: TDD red-green, static-analysis guards for server components
- **New deps**: instantiations go in the container, not the caller
- **New env vars**: read per call, never capture at module load

If you find yourself reaching for `new InMemory*` outside a test file,
or for `new JoseJwtService` outside `src/lib/auth.ts`, **stop**. Use the
container. Use `getSessionUserId()`.

---

## End of Prompt

You have everything you need. The audit-and-fix session is closed;
Tier A is closed; Tier B/C/D are documented and waiting for the next
session to address them. **Don't move a story until Tier B/C/D are
closed.** That's the rule.

Start by:
1. Running the quality gate to verify the current state.
2. Reading `SESSION-TDD-SOLID-AUDIT.md` to internalize the patterns.
3. Picking Tier C (small, fast) → Tier D (delete dead code) → Tier B
   (story-by-story).
