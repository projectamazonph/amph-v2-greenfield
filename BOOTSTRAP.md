# Session Bootstrap Prompt

**Paste this at the start of a new Mavis session.**

---

```
Repo: https://github.com/projectamazonph/amph-v2-greenfield
Branch: main (squash-only merge, branches auto-delete on merge)
Local: /workspace/amph-v2-greenfield/
Tech: Next.js 16 + React 19 + TypeScript 7 + Prisma 7 + Argon2 + Vitest + Playwright + jose + Sentry
Architecture: SOLID five-layer (domain/ → ports/ → usecases/ → infra/ → app/)

Docs: AGENTS.md → CLAUDE.md → docs/build-spec.md → docs/stories/ (story docs live here)
```

---

## Status (2026-07-17)

**3 PRs open — merge order: #34 → #33 → #35**

| PR | Branch | Story | Tests | Notes |
|----|--------|-------|-------|-------|
| [#34](https://github.com/projectamazonph/amph-v2-greenfield/pull/34) | `feature/story-034` | 48 TS errors fix | 552 | Fixes TS errors in `AwardXP`, `RecordStreakVisit`, test stubs |
| [#33](https://github.com/projectamazonph/amph-v2-greenfield/pull/33) | `feature/story-033` | Quiz submission API | 552 | `RecordQuizAttempt`, `ListUserQuizAttempts`, `QuizAttempt` entity |
| [#35](https://github.com/projectamazonph/amph-v2-greenfield/pull/35) | `feature/story-035` | Badge system | 552 | `Badge`, `BadgeAward` entities, `AwardBadge`, `ListUserBadges` use cases |

**Merge order:** #34 → #33 → #35

**After merge**, run: `npx prisma migrate dev` to generate Prisma client for new models (`QuizAttempt`, `Badge`, `BadgeAward`, `XPEvent`).

---

## Quality gate

```bash
cd /workspace/amph-v2-greenfield
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run
```

**Pre-existing TS errors** (will be fixed by #34):
- `AwardXP.ts` — imports `IUserRepository` (renamed in #34)
- `RecordStreakVisit.ts` — return type mismatches
- `TierAccessPolicy.test.ts`, `EnrollStudent.test.ts` — mock missing `updateTotalXp`
- `PrismaXPEventRepository.ts` — `XPEventError` type mismatch

---

## Git rules

- One story = one branch = one PR
- `git checkout -b feature/story-XXX` from `main`
- Stage specific paths only: `git add src/domain/entities/Badge.ts tests/unit/domain/entities/Badge.test.ts`
- Never `git add .`
- Squash-merge into `main`
- Conventional commits: `feat(story-035): description`
- Bypass husky for local commits: `git -c core.hooksPath=/dev/null commit`

---

## Next story

After #35 lands, check `docs/stories/` for the next numbered story. Read its doc before starting.
