# SESSION-HANDOVER.md

**Updated:** 2026-07-19 — Sprints 8 and 9 complete. Cert + email + simulators all shipped. Next: Sprint 10 (Admin panel).

---

## Project Status

| Metric | Value |
|--------|-------|
| Phase | **Sprint 9 complete** (Sprint 10 next) |
| Repo | `projectamazonph/amph-v2-greenfield` (public) |
| Default branch | `main` (squash-merge only, branches auto-delete on merge) |
| Tests | **970 unit tests, 102 test files, 0 TypeScript errors** |
| `main` HEAD | `90fa2b6` — docs(audit): correct Tier D misread in SESSION-TDD-SOLID-AUDIT.md |
| Database | Not provisioned |
| Production | Not deployed |

---

## What Ships in `main` (Stories 033–040)

| # | Story | What |
|---|-------|------|
| #33 | Quiz submission API | `QuizAttempt` model + repo, `RecordQuizAttempt` use case + endpoint |
| #34 | TS error fixes | 48 pre-existing TypeScript errors resolved |
| #35 | Badge system | `Badge`, `BadgeAward` models, `AwardBadge` use case, `ListUserBadges` endpoint |
| #36 | Simulator infrastructure | `Simulator<TIn,TOut>` port, `SimulatorRegistry` port, `SimulatorScenario` model, `StubSimulator`, `InMemorySimulatorRegistry`, `buildSimulatorRegistry()` |
| #37 | Bid Elevator simulator | `BidElevatorSimulator` — volume-weighted bid allocation, score 0–100 |
| #38 | STR Triage simulator | `StrTriageSimulator` — keep/pause/add_as_exact classification with priority-ordered rules |
| #39 | Campaign Builder simulator | `CampaignBuilderSimulator` — campaign structure, keyword stems, match types |
| #40 | Listing Audit + Keyword Research | `ListingAuditSimulator` — listing audit (title/bullet/description) + keyword research |

**Also updated this session:** `BOOTSTRAP.md`, sprint story docs #036–#040.

---

## Architecture: Key Patterns Established

### Simulator system (Sprint 8 pattern — reuse for Sprint 9)

Every simulator follows the same pattern. When you build a new one in Sprint 9 or beyond, mirror this exactly:

```
src/domain/simulator/<name>/
  <Name>Input.ts       — readonly input interface
  <Name>Output.ts      — readonly output interface (score field required)
  <Name>Simulator.ts   — class implementing Simulator<TIn,TOut>, async run()

tests/unit/domain/simulator/<name>/
  <Name>Simulator.test.ts  — unit tests

src/infra/simulator/buildSimulatorRegistry.ts  — replace StubSimulator with new class

tests/unit/composition/container.test.ts        — wiring test: registry.get("<id>") is not StubSimulator
```

**Registry wiring pattern** (the one-line change):
```ts
// Replace this stub:
registry.register(new StubSimulator<unknown, unknown>({
  simulatorId: "<id>",
  name: "<Name>",
}));

// With this real implementation:
registry.register(new <Name>Simulator());
```

**STR Triage gotcha** (priority-order matters): The `add_as_exact` condition must be checked BEFORE the `keep` condition. The `keep` rule fires on `spendRatio < 0.05` — if `add_as_exact` is evaluated after, high-ROAS/low-spend keywords get classified as `keep` instead of `add_as_exact`. The correct order is: `add_as_exact` → `add_as_phrase` → `pause` → `keep`.

**Test pattern**: TDD — write all tests first (Red), write production code (Green), refactor. Never `git add .`, stage specific paths only.

### Badge system (STORY-035)

- `BadgeAward` is created with `createdAt = Clock.now()` inside the domain layer
- XP is NOT awarded in `AwardBadge` — XP awards come from `AwardXP` use case
- Badges are queried via `ListUserBadges` use case (not a raw repo query)

---

## Sprint 9 — Certificates + Email Templates (5 pts)

**DONE.** All 5 stories merged to `main` (PRs #41, #47, and the cert/email commits 020973b, e692235, 9e5eb11).

| ID | Title | Status |
|----|-------|--------|
| STORY-041 | `Certificate` model + repo + `IssueCertificate` use case | ✅ merged |
| STORY-042 | `ReactPdfRenderer` port + adapter + certificate PDF | ✅ merged (PR #47) |
| STORY-043 | `/certificates/[hash]` public view + `/pdf` route | ✅ merged |
| STORY-044 | `RevokeCertificate` on refund + revocation badge | ✅ merged |
| STORY-045 | `EmailSender` port consolidation + React Email templates | ✅ merged |

Use case test coverage: `IssueCertificate` (17 tests, PR #68), `RevokeCertificate` (21 tests, PR #69), `RenderCertificatePdf` (12 tests in PR #47, plus end-to-end container test).

**Next sprint:** Sprint 10 (Admin panel). Start with STORY-046.

---

## Open PRs

All closed. No open PRs.

| # | Branch | Status |
|---|--------|--------|
| #40 | `feature/story-040` | ✅ Merged |
| #44 | `chore/update-bootstrap-s8` | ✅ Merged |

---

## Git Rules (enforced — do not deviate)

- One story = one branch = one PR
- `git checkout -b feature/story-XXX` from `main`
- Stage specific paths only: `git add src/domain/simulator/<name>/ tests/unit/domain/simulator/<name>/`
- **Never `git add .`**
- Squash-merge into `main` (branches auto-delete on merge)
- Conventional commits: `feat(story-035): description`
- Bypass husky for local commits: `git -c core.hooksPath=/dev/null commit`
- Direct push to `main` blocked by GH repo rules — all commits go through PRs
- After any branch switch or `git pull`: run `npx prisma migrate dev` if the schema has new models

## Quality Gate

```bash
cd /workspace/amph-v2-greenfield
./node_modules/.bin/tsc --noEmit && ./node_modules/.bin/vitest run
```

For tests that use the container (Prisma-dependent):
```bash
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  ./node_modules/.bin/vitest run
```

---

## How to Bootstrap a New Session

Copy-paste from `BOOTSTRAP.md` — it has the full prompt.

---

## Key Files Reference

| File | What it is |
|------|-----------|
| `BOOTSTRAP.md` | Paste-able session start prompt (updated after each sprint) |
| `AGENTS.md` | Agent operating rules and constraints |
| `CLAUDE.md` | Architecture overview, layer descriptions |
| `docs/build-spec.md` | Engineering build spec — where things go and why |
| `docs/decisions.md` | Architecture Decision Records |
| `docs/sprint-plan.md` | All 12 sprints, 60 stories, full table |
| `docs/stories/STORY-*.md` | Individual story docs — always check before starting a story |

---

## Daily Log

### 2026-07-19 — Sprint 9 closure + Tier B/C/D audit corrections

**Done:**
- Confirmed all 5 Sprint 9 stories (041, 042, 043, 044, 045) are merged to `main`. Status flipped from "In Progress" to "Done" in each story doc.
- BOOTSTRAP.md: sprint table now shows Sprints 8 + 9 complete; fixed truncated git-rules section; added Sprint 10 (admin) as next.
- SESSION-HANDOVER.md: refreshed to "Sprint 9 complete"; 970 tests / 102 files; HEAD 90fa2b6; "Next agent" now points to STORY-046.
- SESSION-TDD-SOLID-AUDIT.md + NEXT-SESSION-PROMPT.md (PR #71): corrected the Tier D misread (MarkLessonComplete is load-bearing for IssueCertificate; the listed use cases are Pending stories, not dead code).
- Tier B progress: 2 of 12 use cases now tested (IssueCertificate in PR #68, RevokeCertificate in PR #69).
- Tier C closed in PR #70: typed Prisma rows (Prisma.XGetPayload<{}>), dropped 3 unused eslint-disable, middleware → proxy migration.
- No code changes this session — docs only.

**Next agent:**
- See the updated "Next agent" section above.
- Tier B is the only remaining open audit item (10 use cases + 10 in-memory repos). Best done story-by-story.

### 2026-07-18 — Sprint 8: complete

**Done:**
- STORY-039: `CampaignBuilderSimulator` — generates Amazon PPC campaign structures (Sponsored Products + Auto + optional Brands), keyword stems with match types, score 0–100. PR #42 → merged.
- STORY-040: `ListingAuditSimulator` — listing audit (title/bullet/description scoring + findings) + keyword research (prioritized keyword list). PR #43 → merged.
- BOOTSTRAP.md: updated Sprint 8 rows, all simulators marked ✅.
- `buildSimulatorRegistry.ts`: both `campaign-builder` and `listing-audit` now point to real implementations.
- Container wiring tests: added for both new simulators.
- 601 tests passing, 0 TS errors.

**Test fix notes (for future reference):**
- Auto campaign ad groups intentionally have empty keyword lists (Amazon auto-targeting doesn't use manual keywords). Skip empty-keyword checks for ad groups named containing "Auto" or "Brand".
- `bullets: readonly string[]` (from `ListingAuditInput`) — use `readonly string[]` in `auditBullets()` to avoid TS2345.

**Key decisions made this sprint:**
- All 4 simulators score 0–100 for structural completeness (not model quality — that's future scope).
- Simulator score lives in `output.score` — all simulators follow this.
- STR Triage `add_as_exact` must be evaluated before `keep` (priority-order bug fix in #38).
- `Simulator<TIn,TOut>` is the correct generic — `<TIn, TOut>` (in → out), not `<T>`. Confirmed via existing `BidElevatorSimulator` usage.

**Next agent:**
1. Read `docs/stories/STORY-046.md` for the admin panel entry point.
2. Check `STORY-046-prep-1.md`, `-prep-2.md`, `-prep-3.md` for the prep work that must land first.
3. Implement STORY-046: `/admin/*` route group with the NavSidebar + TopBar shell + 6-tile stat dashboard.
4. Follow the established patterns (container-only data access, pure-helper + thin-shell server actions, static-analysis regression guards for server components).
5. Tier B use cases to also test if STORY-046 touches them (likely `GetAdminDashboardStats` — already has tests, but verify coverage of the 6 stats).

---

## Memoria Protocol

This repo uses Memoria for cross-agent context. Tag memories with:
- `project:amph-v2`
- `phase:4` (implementation)
- `agent:mavis`

Other agents (Atlas, Vader) share the same memoria server. Leave notes on handoffs.
