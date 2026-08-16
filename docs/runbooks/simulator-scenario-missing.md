# Simulator scenarios missing in production

**Severity:** P1 (student-facing feature is broken, no data loss)
**Owner:** On-call engineer
**Last reviewed:** 2026-08-16

Students see "Something went wrong" on every `/tools/<simulator>` page; the Next.js error log shows `scenario_not_found`. `/api/health/ready` returns HTTP 503 with a `missing_scenarios` payload listing the affected simulator ids. Fix with the seed script described below, then redeploy or re-run the seed against production.

## Symptoms

- Every student-facing simulator route (`/tools/bid-elevator`, `/tools/str-triage`, `/tools/campaign-builder`, `/tools/listing-audit`, `/tools/keyword-research`) renders the generic Next.js "Something went wrong. We could not load this page." screen with an error digest in the bottom corner.
- The digest comes from `StartSimulatorAttempt` returning `scenario_not_found` — the page never reaches the grader.
- `GET /api/health/ready` returns 503 with body `{ "status": "missing_scenarios", "missing": ["<simulatorId>", ...] }`. The list always names at least one simulator; if it is empty, you are looking at a different outage (DB unreachable → status `unavailable`).
- Every other student feature (lessons, certificates, admin) keeps working; only the five simulator routes are broken.

## Diagnosis

1. Confirm the symptom is the simulator outage and not a generic 5xx storm. From a local shell with the production `DATABASE_URL` exported:
   ```bash
   curl -sS https://projectamazonph.vercel.app/api/health/ready | jq
   ```
   If the response is `status: "missing_scenarios"` with a non-empty `missing` array, this runbook applies.
2. Note the exact simulator ids from the `missing` array. As of 2026-08-16 the registered set is `bid-elevator`, `str-triage`, `campaign-builder`, `listing-audit`, `keyword-research` (see `src/infra/simulator/buildSimulatorRegistry.ts`); any subset of those is the expected shape, a wholly different id means the registry was edited out of band.
3. From the same shell, sanity-check that the seed script itself would actually publish rows against this database — list the published scenarios directly:
   ```bash
   pnpm tsx -e "
     import { prisma } from './src/infra/database/prisma';
     const rows = await prisma.simulatorScenario.findMany({ where: { status: 'published' }, select: { simulatorId: true, id: true } });
     console.log(rows);
     await prisma.\$disconnect();
   "
   ```
   An empty result (or rows missing the simulator ids from step 2) confirms the table is empty for those simulators. A non-empty result that still trips the readiness probe means a registry/scenario-id mismatch (investigate `buildSimulatorRegistry.ts` vs the seed script's `SCENARIOS` array — every registered `simulatorId` must have a row whose `simulatorId` column matches it).

## Mitigation

The fastest unblock is running the existing seed script against production; it is idempotent (`upsert` on `id`) and re-running is safe.

1. Export the production database credentials locally. The seed script reads `DATABASE_URL` from `.env.local` or `.env`; copy the production value from Vercel (Settings → Environment Variables → Production → `DATABASE_URL`) into a throwaway local `.env.local.production-seed` and load it:
   ```bash
   set -a; source .env.local.production-seed; set +a
   pnpm db:seed:scenarios
   ```
   Expected output ends with `Done: N created, M upserted, 0 failed.` Any non-zero `failed` count means the seed could not write — investigate the error before continuing; do not assume the readiness probe will recover.
2. Re-check the readiness probe:
   ```bash
   curl -sS https://projectamazonph.vercel.app/api/health/ready | jq
   ```
   It should now return 200 with `status: "ok"`. If it does not, jump to "Resolution did not recover" below.
3. Once the probe is green, no redeploy is needed — the fix lives entirely in the database. Students' next request to `/tools/<simulator>` will resolve a published scenario and the page renders normally.

## Resolution

The build hook on `vercel.json` already runs `pnpm db:seed:scenarios` after `pnpm prisma:deploy` for every production build, so a redeploy is the durable fix and the manual run above is the emergency mitigation. To verify the build hook is intact:

```bash
# vercel.json buildCommand should contain `pnpm db:seed:scenarios` inside the
# production-only if block, chained after `pnpm prisma:deploy` with `&&`.
grep -A1 '"buildCommand"' vercel.json
```

If the line is missing or has been reordered (e.g. a hotfix edit that ran `prisma:deploy` only), the next deploy will silently regress — fix `vercel.json` and redeploy.

If the seed script itself has a bug (e.g. a new simulator was registered in `buildSimulatorRegistry.ts` without a matching entry in `scripts/seed-simulator-scenarios.ts`), add the missing scenario to the `SCENARIOS` array in the seed script and run `pnpm db:seed:scenarios` against production. The seed script is the single source of truth for which published scenarios exist.

## Verification

- `GET /api/health/ready` returns 200 with `status: "ok"` and no `missing` field.
- `GET /api/health/ready` repeated 5 times in a row returns 200 — catches flakiness in `findPublished`.
- Manually load each simulator route from an authenticated student session (or impersonate one via the admin user-detail page → Impersonate). Every page should render its scenario panel, not the "Something went wrong" screen.
- The Next.js function logs no longer contain `[health/ready] missing published SimulatorScenario rows for simulators: ...`.
- The simulator scoring engine still grades submissions correctly; run one full attempt for each simulator and confirm it returns a non-empty feedback object. (The seed script's `inputSchema` content is what feeds the grader; if it was wiped before this incident, the manual run above restores it.)

## Resolution did not recover

- If `missing` is still non-empty after the seed run, the registry was edited (a new simulator registered) without a corresponding `SCENARIOS` entry. Diff `src/infra/simulator/buildSimulatorRegistry.ts` against `scripts/seed-simulator-scenarios.ts`; every `simulatorId` in the former must have a row in the latter's `SCENARIOS` array.
- If `status` is `unavailable` instead of `missing_scenarios`, the readiness probe's `findPublished` call hit a transient DB error. The `console.error` in the route logs the exact simulator id and error kind — fetch the Vercel function log for that line and treat it as a DB outage (see `docs/runbooks/db-backup-restore.md` if data loss is suspected, otherwise page the DB operator).
- If a specific simulator is still broken after the probe is green, that simulator's page or grader has a separate bug unrelated to scenarios; collect the error digest, open an incident, and link this runbook in the postmortem.

## Postmortem

Required for any P1. Cover: how the seed was missed (was the build hook missing from `vercel.json`, did the seed script itself error, did a manual DB restore skip it), the student-visible window, the list of simulators affected, and whether `pnpm test` / CI caught it. If the root cause is the build hook being absent, add a CI step that asserts `vercel.json` contains `pnpm db:seed:scenarios` so this cannot regress silently. If the root cause is a registry/scenario mismatch, add a CI step that iterates `simulatorRegistry.list()` and asserts each id has a corresponding `SCENARIOS` entry in the seed script.

## Related documents

- `src/app/api/health/ready/route.ts` — the readiness probe that surfaces this
- `src/app/api/health/ready/__tests__/route.test.ts` — the regression tests
- `src/infra/simulator/buildSimulatorRegistry.ts` — single source of truth for registered simulator ids
- `scripts/seed-simulator-scenarios.ts` — the idempotent seed script
- `vercel.json` — the production build hook