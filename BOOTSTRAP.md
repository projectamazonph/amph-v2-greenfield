# Session Bootstrap Prompt

**Paste this at the start of a new Mavis session.**

---

```
Repo: https://github.com/projectamazonph/amph-v2-greenfield
Branch: main (squash-only merge, branches auto-delete on merge)
Local: /workspace/amph-v2/
Tech: Next.js 16 + React 19 + TypeScript 7 + Prisma 7 + Argon2 + Vitest + Playwright + jose + Sentry
Architecture: SOLID five-layer (domain/ → ports/ → usecases/ → infra/ → app/)

Docs: AGENTS.md → CLAUDE.md → docs/build-spec.md → SESSION-HANDOVER.md → OPERATING_GUIDELINES.md (in that order)
```

---

## Status (2026-07-17)

**5 PRs open — all need CI checks before merging:**

| PR | Branch | Merge after |
|----|--------|------------|
| [#6](https://github.com/projectamazonph/amph-v2-greenfield/pull/6) | `feature/story-001-006-foundation` | — |
| [#7](https://github.com/projectamazonph/amph-v2-greenfield/pull/7) | `feature/story-008` | #6 |
| [#8](https://github.com/projectprojectamazonph/amph-v2-greenfield/pull/8) | `feature/story-012` | #7 |
| [#10](https://github.com/projectamazonph/amph-v2-greenfield/pull/10) | `feature/story-013` | #8 |
| [#9](https://github.com/projectamazonph/amph-v2-greenfield/pull/9) | `feature/story-016-017` | #10 |

**Do this first:** Check CI on each PR. Fix any failures. Re-push.

**Then merge in order:** #6 → #7 → #8 → #10 → #9

---

## What ships across the 5 PRs

**#6 (foundation):** `Result<T,E>`, `Money`, `Clock`, `IdGenerator`, `User` entity, `SignUp` use case, `Argon2PasswordHasher` (argon2id), `PrismaUserRepository`, `/signup` page, `/api/health`, middleware, Sentry, DI container, Prisma schema (8 models)

**#7 (Course):** `Course` entity with fail-fast domain rules (slug kebab-case, non-negative price, curriculum ≥1 section × ≥1 lesson), `courseLessonCount`, `courseTotalDurationMinutes`, `courseIsAvailable`

**#8 (Login):** `SessionRepository` port, `Session` entity, `Login` use case (email verification, Argon2 password check, 7-day session creation), `InMemorySessionRepository`

**#10 (JWT):** `JwtService` port + `JoseJwtService` adapter (jose, HS256), `Login` signs JWT with `{sub, sessionId, role}`, middleware verifies JWT on `/dashboard`, `/admin`, `/enroll`, `/order`, attaches `x-amph-user-id` request headers

**#9 (catalog + enrollment):** `CourseRepository` port, `ListCourses` + `GetCourse` + `EnrollStudent` use cases, `/courses` page (hero + grid), `/courses/[slug]` page (cover + curriculum accordion), `EnrollButton` (useActionState), `enroll` server action

**All PRs:** 161 tests passing, 0 TypeScript errors

---

## Quality gate

```bash
cd /workspace/amph-v2
pnpm typecheck && pnpm test
```

---

## Continue with

After CI checks pass and PRs are merged:

**STORY-021** — PayMongo checkout use case
- `PayMongoService` port (create checkout session, verify webhook signature)
- `Checkout` use case (validate course, generate idempotency key, call PayMongo, store `Checkout` row)
- Handle `payment.paid` webhook: create `Payment`, `Enrollment`, `Receipt` rows in a transaction
- Wire into `EnrollButton` for paid courses → redirect to PayMongo hosted page

Read `docs/stories/STORY-021.md` (if it exists) or `FEATURES.md` §"Checkout" before starting.

---

## Git rules (summary)

- One story = one branch = one PR
- `git checkout -b feature/story-XXX` from `main`
- Stage specific paths only: `git add src/domain/entities/Course.ts tests/unit/course.test.ts`
- Never `git add .`
- Squash-merge into `main`
- Conventional commits: `feat(story XXX): description`
