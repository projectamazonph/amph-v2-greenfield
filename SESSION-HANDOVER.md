# SESSION-HANDOVER.md

**Updated:** 2026-07-18 — Sprint 8 complete. All simulators done. Next: Sprint 9 (Certificates + Email).

---

## Project Status

| Metric | Value |
|--------|-------|
| Phase | **Sprint 8 complete** |
| Repo | `projectamazonph/amph-v2-greenfield` (public) |
| Default branch | `main` (squash-merge only, branches auto-delete on merge) |
| Tests | **601 unit tests, 59 test files, 0 TypeScript errors** |
| `main` HEAD | `bdac2fe` — feat(story-040): Listing Audit + Keyword Research simulator |
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

Per `docs/sprint-plan.md`, Sprint 9 stories:

| ID | Title | Notes |
|----|-------|-------|
| STORY-041 | `Certificate` model + repo + `IssueCertificate` use case | Start here |
| STORY-042 | `ReactPdfRenderer` port + adapter + certificate PDF | |
| STORY-043 | `/certificates/[hash]` public view + `/pdf` route | |
| STORY-044 | `RevokeCertificate` on refund + revocation badge | |
| STORY-045 | `EmailSender` port consolidation + React Email templates | |

**Start with STORY-041.** Check `docs/stories/STORY-041.md` — it may already exist.

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
1. Read `docs/stories/STORY-041.md` (if it exists) or write it.
2. Implement STORY-041: `Certificate` model + repo + `IssueCertificate` use case.
3. Wire into registry if needed (unlikely — certs don't go through the simulator registry).
4. Run tests → commit → PR → merge.
5. Continue with STORY-042 (PDF renderer), STORY-043 (cert view), STORY-044 (revocation), STORY-045 (email templates).

---

## Memoria Protocol

This repo uses Memoria for cross-agent context. Tag memories with:
- `project:amph-v2`
- `phase:4` (implementation)
- `agent:mavis`

Other agents (Atlas, Vader) share the same memoria server. Leave notes on handoffs.
