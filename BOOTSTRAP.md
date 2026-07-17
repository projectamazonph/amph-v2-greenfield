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

## Status (2026-07-18)

**All stories merged. No open PRs.**

| # | Story | Status |
|---|-------|--------|
| #34 | Fix 48 pre-existing TS errors | ✅ merged |
| #33 | Quiz submission API + RecordQuizAttempt | ✅ merged |
| #35 | Badge system (Badge, BadgeAward, AwardBadge, ListUserBadges) | ✅ merged |
| #36 | Simulator infrastructure (ports, entity, registry) | ✅ merged |
| #37 | Bid Elevator simulator | ✅ merged |
| #38 | STR Triage simulator | ✅ merged |
| #39 | Campaign Builder simulator | ✅ merged |
| #40 | Listing Audit + Keyword Research simulator | ✅ merged |
| #41 | *(Sprint 9 — see docs/sprint-plan.md)* | — |

**After any branch switch or `git pull`:** run `npx prisma migrate dev` if the schema has new models that need migration.

---

## Quality gate

```bash
cd /workspace/amph-v2-greenfield
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run
```

For vitests that import the container (which uses Prisma):
```bash
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  ./node_modules/.bin/vitest run
```

---

## Git rules

- One story = one branch = one PR
- `git checkout -b feature/story-XXX` from `main`
- Stage specific paths only: `git add src/domain/entities/Badge.ts tests/unit/domain/entities/Badge.test.ts`
- Never `git add .`
- Squash-merge into `main`
- Conventional commits: `feat(story-035): description`
- Bypass husky for local commits: `git -c core.hooksPath=/dev/nu