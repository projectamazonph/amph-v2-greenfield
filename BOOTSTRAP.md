# Session Bootstrap Prompt

**Paste this at the start of a new Mavis session.**

---

```
Repo: https://github.com/projectamazonph/amph-v2-greenfield
Branch: main (squash-only merge, branches auto-delete on merge)
Local: /workspace/amph-v2-greenfield/
Tech: Next.js 16 + React 19 + TypeScript 7 + Prisma 7 + Argon2 + Vitest + Playwright + jose + Sentry
Architecture: SOLID five-layer (domain/ → ports/ → usecases/ → infra/ → app/)

Docs: AGENTS.md → CLAUDE.md → OPERATING_GUIDELINES.md → SESSION-TDD-SOLID-AUDIT.md → SESSION-HANDOVER.md → docs/build-spec.md → docs/stories/ (story docs live here)
```

**For new sessions, also read `NEXT-SESSION-PROMPT.md`** — it has the
strict-TDD + strict-SOLID + git discipline + initial setup, plus what's
still open (Tier B/C/D from the recent audit).

---

## Status (2026-07-19)

**Sprints 8 and 9 complete. No open PRs.**

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
| #41 | Certificate model + repo + IssueCertificate use case | ✅ merged (PR #41) |
| #42 | React PDF renderer port + certificate PDF | ✅ merged (PR #47) |
| #43 | /certificates/[hash] public view + /pdf route | ✅ merged (commit 020973b) |
| #44 | RevokeCertificate on refund + revocation badge | ✅ merged (commit e692235) |
| #45 | EmailSender port + React Email templates | ✅ merged (commit 9e5eb11) |

**Test counters:** 970/970 passing, 0 tsc errors. Recent PRs: #68 (IssueCertificate Tier B, +17), #69 (RevokeCertificate Tier B, +21), #70 (Tier C cleanup), #71 (audit doc correction).

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
- Bypass husky for local commits: `git -c core.hooksPath=/dev/null commit`
- Direct push to `main` blocked by GH repo rules — all commits go through PRs

## Sprint roadmap

See `docs/sprint-plan.md` for the full 12-sprint, 60-story plan.

| Sprint | Theme | Status |
|--------|-------|--------|
| 1-7 | Foundation (auth, enrollment, payments, access policy) | ✅ done |
| 8 | Simulators (4 PPC simulators) | ✅ done |
| 9 | Certificates + Email | ✅ done |
| 10 | Admin panel (STORY-046+ prep-1/2/3 + dashboard) | next |
| 11-12 | (TBD) | pending |

**Next story to pick up:** STORY-046 (Admin layout + dashboard). Depends on STORY-046-prep-1/2/3 which should be checked first — see the story doc.