# Session Bootstrap Prompt

**Paste this at the start of a new Mavis session.**

---

```
Repo: https://github.com/projectamazonph/amph-v2-greenfield
Branch: main (squash-only merge, branches auto-delete on merge)
Local: /workspace/amph-v2-greenfield/
Tech: Next.js 16 + React 19 + TypeScript 7 + Prisma 7 + Argon2 + Vitest + Playwright + jose + Sentry
Architecture: SOLID five-layer (domain/ → ports/ → usecases/ → infra/ → app/)

Docs: AGENTS.md → CLAUDE.md → docs/build-spec.md → SESSION-HANDOVER.md → OPERATING_GUIDELINES.md (in that order)
```

---

## Status (2026-07-17)

**3 PRs open — merge in order:**

| PR | Branch | Description | Merge after |
|----|--------|-------------|------------|
| [#34](https://github.com/projectamazonph/amph-v2-greenfield/pull/34) | `feature/story-034` | Fix 48 pre-existing TS errors on main | — |
| [#33](https://github.com/projectamazonph/amph-v2-greenfield/pull/33) | `feature/story-033` | Wire RecordQuizAttempt + quiz submission API | #34 |
| [open] | `feature/story-035` | *(next story — see below)* | #33 |

**Merge order: #34 → #33.** The TS-fix PR (#34) must land before #33 so CI on #33 doesn't catch errors it didn't introduce.

---

## Current state of `main` (2026-07-18)

All core foundation stories merged: #6/#10 → #11/#21 → #22–#32

**Quality gate (verified 2026-07-18):**
- `tsc --noEmit`: **0 TypeScript errors** (after #34 lands)
- `vitest run`: **538 tests passing** (baseline of main, before #033)

After #33: 552 tests (+14 new: 3 container + 11 handler tests)

**Known pre-existing issues not yet fixed:**
- ESLint is broken on `main` (`@next/eslint-plugin-next` import resolution). Husky pre-commit bypass required. Not blocking — tsc + vitest are the gate.

---

## Quality gate

```bash
cd /workspace/amph-v2
# Set required env vars for Prisma
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
pnpm typecheck && pnpm test
```

---

## Continue with

After #34 and #33 are merged, check `docs/stories/` for the next numbered story. FEATURES.md §5 (Curriculum Delivery) has quiz-related stories that follow naturally.

Read `docs/stories/STORY-0XX.md` (next story) and `FEATURES.md` §"Quizzes" before starting.

---

## Git rules (summary)

- One story = one branch = one PR
- `git checkout -b feature/story-XXX` from `main`
- Stage specific paths only: `git add src/domain/entities/Course.ts tests/unit/course.test.ts`
- Never `git add .`
- Squash-merge into `main`
- Conventional commits: `feat(story XXX): description`
