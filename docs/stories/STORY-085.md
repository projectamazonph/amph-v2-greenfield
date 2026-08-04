# STORY-085: Scenario publishing + versioning

**Points:** 1 (sized), actual scope much larger — see "Why this is bigger than 1pt" below.
**Epic:** Sprint 16 — Assessment Platform Maturity.

## Status

**Status:** Done — 2026-08-04.

## Why this is bigger than 1pt

`docs/sprint-plan.md`'s Sprint 16 listed this as a 1-point, title-only entry with no
acceptance criteria. Research at the start of this session found the real picture:
`SimulatorScenario` DB rows were pure metadata (name/description/difficulty/estimatedMinutes)
with an empty `inputSchema` — every one of the 5 practice pages
(`src/app/tools/<name>/page.tsx`) hardcoded its actual scenario content in a `SCENARIO`
const, completely decoupled from the DB row. There was no draft/published state (only
active/archived soft-delete), `SimulatorAttempt.scenarioVersion` was dead plumbing
(hardcoded to `1`), and two of the five simulators (bid-elevator, campaign-builder) had a
graded-attempt use case (`bidElevatorAttempt()`, `campaignBuilderAttempt()`) that nothing in
the UI ever called — every practice run went through a legacy preview-only function that
never persisted a `SimulatorAttempt`.

Given this, the full scope taken on was: a real draft→published→archived lifecycle with
version history, backfilled real scenario content, and all 5 practice pages/actions
rewired to read that content server-side instead of trusting a hardcoded const or
client-echoed data.

## What shipped

### Domain + ports + migration (Stage 1)

- `SimulatorScenario` gains `scenarioKey: string`, `version: number`,
  `status: "draft" | "published" | "archived"`, `createdAt`, `updatedAt`.
  `createSimulatorScenario()` always produces `status: "draft"` now — creating a scenario no
  longer makes it live immediately. New domain functions: `publishScenario()`,
  `createDraftFromScenario()`, `archiveScenario()`.
- `ISimulatorScenarioRepository` gains `findPublished(simulatorId)`, `listVersions(scenarioKey)`,
  `publish(id)` (atomic: archives any existing published sibling sharing the same
  `scenarioKey`, then publishes the target, inside a `$transaction`). `findById()` no longer
  filters archived rows (an admin navigating to a specific version by id should always
  resolve it); `listAll()` keeps hiding archived.
- Migration `20260804000000_simulator_scenario_publishing` adds the 3 columns, backfills
  existing rows as `scenarioKey = id, version = 1, status = 'published'`.
- Both `PrismaSimulatorScenarioRepository` and `InMemorySimulatorScenarioRepository` updated
  and fully tested for all 8 methods.

### Use cases + container wiring (Stage 2)

- New `PublishSimulatorScenario`, `CreateScenarioVersionDraft`, `ListScenarioVersions` use
  cases. `UpdateSimulatorScenario` now rejects edits unless the scenario is a draft (new
  `not_editable` error) — published/archived rows are immutable historical records.
  `StartSimulatorAttempt` now stamps `scenarioVersion: scenarioResult.value.version` instead
  of the hardcoded `1`.
- `AuditAction` gains `"simulator.published"` / `"simulator.draft_created"`.

### Admin UI (Stage 3)

- Fixed a pre-existing gap: 4 files' `SIMULATOR_IDS` arrays omitted `"keyword-research"`
  despite the domain-level `SimulatorId` union already including it
  (`/admin/simulators` list/new/edit pages, `AdminSimulatorsTable`).
- `/admin/simulators` groups scenarios by `scenarioKey` (one row per family: published
  version if one exists, else the newest draft) with a status badge and version indicator.
- New `/admin/simulators/[id]/versions` page: full version history for a scenario family,
  with a "Publish" button on draft rows and "Create new draft from this version" on
  published/archived rows.
- `/admin/simulators/[id]/edit` now branches on status: drafts render the existing editable
  form plus a new "Publish this version" section; published/archived rows render read-only
  with a "Create new draft" button instead of the form.

### Seed script + content backfill (Stage 4)

`scripts/seed-simulator-scenarios.ts` now populates each scenario's `inputSchema` with real
content losslessly migrated from the hardcoded `SCENARIO` const each page used to own, and
seeds every row as `version: 1, status: "published"`:

- **bid-elevator**: 9 economics scalars + 8 keyword objects (15 fields each).
- **str-triage**: economics scalars, 3 lexicons, `existingTargets[]`, 14 `rows`.
- **campaign-builder**: `{productCategory, productNiche, monthlyBudget}` — genuinely all
  that exists; richer ground-truth authoring is STORY-084, not touched here.
- **listing-audit**: `{category, niche, bullets, description, images: [], hasVideo: false,
hasAPlus: false, marketplace: "US"}` — the previously-implicit defaults made explicit.
- **keyword-research**: `{defaultNicheId: "bamboo-cutting-board"}` only — `KeywordDataset`
  content (STORY-081) is its own already-versioned system, intentionally not duplicated.

### Per-simulator server-side rewire (Stage 5)

All 5 practice pages now fetch `container.scenarioRepo.findPublished(simulatorId)`
server-side instead of importing a hardcoded `SCENARIO` const, so publishing a new version
through the admin UI actually changes what students see and get graded against. Each
simulator's server action also resolves its scenario server-side rather than trusting a
client-echoed payload, closing a real trust gap — done in ascending risk order:

1. **listing-audit** — `category`/`niche`/`images`/`hasVideo`/`hasAPlus`/`marketplace` are no
   longer accepted from the client (a forged category could pick an easier rubric variant);
   `title`/`bullets`/`description` remain the student's editable submission.
   `validateAttemptInput()`'s hand-rolled checks replaced with Zod.
2. **str-triage** — was already wired to the graded lifecycle; this was a pure trust-gap fix.
   The form used to echo the _entire_ scenario (economics, lexicons, `existingTargets`, all
   14 rows) back on submit; the action now resolves it server-side and trusts only
   `userActions` + `mode`.
3. **keyword-research** — smallest change: the page reads `defaultNicheId` server-side
   instead of a hardcoded seed niche, and the action resolves its `scenarioId` the same way.
   `niche` itself stays client-supplied by design (not a trust gap — the student can research
   any niche; `KeywordDatasetRepository.findByNiche()` resolves real content server-side
   regardless of what's asked for).
4. **campaign-builder** — `CampaignBuilderForm` called the legacy `buildCampaign()`, which
   never persisted a `SimulatorAttempt` at all. Switched to the existing but previously-unwired
   `campaignBuilderAttempt()`, giving campaign-builder its first real persisted-attempt path.
   `productCategory`/`productNiche`/`monthlyBudget` are now server-resolved and shown
   read-only; `targetingStrategy` remains the student's real input. `buildCampaign()` and its
   tests removed.
5. **bid-elevator** — same shape as campaign-builder: `BidElevatorForm` called the legacy
   `runBidElevator()` (no persistence); switched to `bidElevatorAttempt()`. The form used to
   echo the full scenario (9 economics scalars + all 8 keywords' CTR/CVR/elasticity/evidence)
   back to the server; now only `userBidAdjustments` + `mode` are trusted from the client.
   `runBidElevator()` and its tests removed. `BidElevatorResult` (the shared result view) was
   unchanged — its props already matched what `bidElevatorAttempt()`'s response maps onto.

## Known limitations (discovered during implementation, deliberately not expanded into)

- **No manual campaign-structure or fix/skip editor exists in the UI.** `campaignBuilderAttempt()`
  accepts an optional `userAdjustedCampaigns` (a self-built campaign structure to grade) and
  `listingAuditAttempt()` requires `userFindingActions` (per-finding fix/skip decisions) —
  both existed in code before this story, but no UI collects either. campaign-builder now
  persists an attempt without them (`scoreDimensions`/`feedback` stay `null`, same degraded
  behavior the legacy path always had). listing-audit's UI still calls the preview-only
  `auditListing()`, not `listingAuditAttempt()`, for the same reason — building either editor
  is a real, separate feature addition, not a rewire, and was out of scope for this story.
- **No Postgres partial-unique-index enforces "at most one published version per
  scenarioKey."** Enforced at the transaction layer (`PrismaSimulatorScenarioRepository.publish()`)
  instead — a deliberate choice for this solo-admin, low-traffic app, not an oversight.
- **STORY-083/084's territory untouched.** No listing-audit rubric changes, no
  campaign-builder ground-truth authoring — both still need Ryan's Amazon PPC judgment.
- **No `{{placeholder}}`-style content templating** — same limitation the email-template
  system (STORY-095.5) has; not addressed here either.
- Manual `pnpm dev` browser smoke-testing of the admin publish/draft flow and each rewired
  student practice page was not performed in this session — no live Postgres or browser was
  available in the remote execution environment this work ran in. All 6 stages were verified
  via `pnpm tsc --noEmit`, `pnpm lint`, `pnpm test`, `pnpm test:arch`, and `pnpm build` after
  every commit; a real click-through pass before the next production deploy is recommended.

## Verification

Run after every stage's commit throughout this story:

```bash
pnpm tsc --noEmit
pnpm lint
DATABASE_URL="postgresql://test:test@localhost:5432/amph_test" \
JWT_SECRET="test-secret-at-least-32-bytes-long-please" \
  pnpm test       # 338 files / ~3578-3592 passed / 2 skipped throughout (count shifts per stage)
pnpm test:arch    # 13 files / 629 passed
pnpm build        # succeeds
```
