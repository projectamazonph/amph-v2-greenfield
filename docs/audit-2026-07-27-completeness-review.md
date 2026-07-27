# Project completeness audit

**Reviewed:** 2026-07-27  
**Repository:** `amph-v2-greenfield`  
**Commit reviewed:** `5b8072b` (`fix(auth): harden buildAppUrl...`)  
**Scope:** repository source, Prisma schema and migrations, routes, server actions, tests, and project documentation.

This audit records what is present in the repository. Production URL, database contents, Vercel configuration, PayMongo configuration, and email delivery were not independently verified from this workstation. `src/` and `prisma/` are the source of truth when they disagree with older design documents.

## Inventory

| Surface                              | Verified state                                                       |
| ------------------------------------ | -------------------------------------------------------------------- |
| App Router page and route files      | 68                                                                   |
| Prisma models                        | 34                                                                   |
| Prisma enums                         | 4                                                                    |
| Committed SQL migrations             | 20                                                                   |
| Tool URLs                            | 5                                                                    |
| Registered simulator implementations | 4; Keyword Research reuses Listing Audit and is not a registry entry |
| Test files                           | 280 test files discovered by Vitest                                  |
| Story documents                      | 65                                                                   |
| Operational runbooks                 | 4 authored runbooks plus the index                                   |

The repository is not an empty greenfield scaffold. It contains a working Next.js application, a Prisma-backed production composition root, the public and admin route trees, payment and webhook adapters, content import tooling, and a substantial automated test suite.

## Verification results

Commands were run from the repository root.

| Check                           | Result       | Notes                                                                  |
| ------------------------------- | ------------ | ---------------------------------------------------------------------- |
| `pnpm typecheck`                | Pass         | Zero TypeScript errors                                                 |
| `pnpm lint`                     | Pass         | No ESLint errors or warnings reported                                  |
| `pnpm build`                    | Pass         | Next.js 16 standalone build completed and generated the route manifest |
| `pnpm test:arch`                | Pass         | 13 files, 512 tests                                                    |
| `set NODE_ENV=test&& pnpm test` | Partial      | 2,962 passed, 2 skipped, 2 failed                                      |
| `pnpm prisma validate`          | Pass         | Direct Prisma CLI validation succeeds                                  |
| Playwright E2E                  | Not verified | Required browser binaries are not installed in this environment        |

The two unit-suite failures are in `tests/integration/prisma-migration-contract.test.ts`. That test invokes `./node_modules/.bin/prisma`, which is a POSIX path and fails under the Windows command shell before the Prisma command runs. The schema itself validates successfully. Run the contract test in CI or update its command construction before treating it as a product failure.

Local `.env` sets `NODE_ENV=production`. Tests that exercise the default `amph_session` cookie name need `NODE_ENV=test` (or a request-protocol override); otherwise the test container signs a token while the guard looks for the production `__Secure-amph_session` cookie.

## Implementation findings

### P1, production behavior gaps

1. **Admin badge mutations are still unimplemented.** `buildProductionContainer()` wires `PrismaBadgeRepository`, but `create`, `update`, and `archive` throw `Not implemented` (`src/infra/repositories/PrismaBadgeRepository.ts:35-48`). Badge listing and awards have adapters, but the admin badge create, edit, and archive actions cannot complete against production Postgres.
2. **Simulator attempts use a synthetic owner.** The four graded tool actions pass `userId: "system"` instead of the authenticated user (`src/app/tools/bid-elevator/actions.ts:120`, `campaign-builder/actions.ts:142`, `str-triage/actions.ts:164`, `listing-audit/actions.ts:225`). Attempts and decisions therefore cannot be reliably attributed to, or listed for, the student who submitted them.
3. **The admin seed script bypasses the Prisma 7 adapter contract.** `src/infra/database/prisma.ts` explicitly requires the `PrismaPg` adapter and says not to construct `PrismaClient` elsewhere. `scripts/seed-admin-user.mjs:103` constructs `new PrismaClient()` directly. The script exists, but its end-to-end execution against the current Prisma configuration still needs a safe test or adapter-based implementation.
4. **Session revocation and account lockout are incomplete.** `getSessionUserId()` verifies JWT signature and expiry but does not consult the `sessions` table or `lockedUntil`. Deleting a session row or setting `lockedUntil` does not invalidate an already-issued token. The workaround and impact are documented in `docs/runbooks/admin-access-recovery.md`.
5. **First-time impersonation does not preserve the admin token.** `impersonateUser.action.ts:149` records a TODO when no backup cookie exists. `stopImpersonating.action.ts:53` then signs the user out instead of restoring the original admin session. Nested impersonation is intentionally unsupported, but the first impersonation path is incomplete.

### P2, incomplete or misleading product behavior

6. **Dashboard pending refunds are hardcoded to zero.** `GetAdminDashboardStats` documents that no refund-request repository is available and returns `pendingRefunds: 0` (`src/usecases/GetAdminDashboardStats.ts:23,127`). The dashboard tile is not a live metric.
7. **The lesson renderer still shows a quiz placeholder.** A dedicated quiz page and API route exist, but `LessonContent.tsx:131` renders “Interactive quiz, coming soon!” for quiz lesson content. The course lesson flow and quiz flow are not fully joined.
8. **Keyword Research is a UI alias, not a fifth registered simulator.** `buildSimulatorRegistry.ts` registers four implementations. `/tools/keyword-research` is manually added in the tools page and reuses Listing Audit behavior. Documentation must not describe five independent simulator modules.
9. **The health endpoint is an application liveness response, not a database readiness probe.** `src/app/api/health/route.ts` returns `status: "ok"` without opening or querying Prisma. Monitoring that endpoint alone cannot detect a database outage.
10. **The settings page checks the wrong PayMongo variable name.** The page checks `PAYMONGO_SECRET_KEY`, while `.env.example`, the adapter, and CI use `PAYMONGO_SECRET`. The admin environment status can report PayMongo as missing when the configured variable is present.
11. **Cron documentation is stale.** `vercel.json` schedules the reminder job once daily, and the container includes `PrismaSentReminderRepository` for idempotency. The route comments still describe a five-minute schedule and a missing `SentReminder` follow-up. The operational index should describe the deployed schedule as configuration, not as a five-minute guarantee.
12. **Content and pricing depend on database seeding.** `/courses` and `/pricing` intentionally render “coming soon” when their respective repositories return no rows. The repository includes import and pricing seed scripts, but a successful build does not prove that a deployed database contains published courses or active pricing tiers.

## Documentation drift found

- `README.md` still says the first deploy is pending, points screenshots at `docs/screenshots/` (the files are under `public/screenshots/`), omits current admin and 2FA routes, and lists a nonexistent `pnpm sentry:sourcemaps` script.
- `FEATURES.md` says every listed feature is implemented, but it also describes absent account deletion/export, abandoned-cart email, live-class RSVP and recordings, external PDF storage, and other unshipped behavior as complete.
- `docs/architecture/01-layer-wiring.md`, `02-admin-panel-wiring.md`, and `03-site-map.md` describe the admin panel as planned and claim in-memory production repositories and a webhook container bypass. Those statements are no longer true for the current composition root, although the badge adapter gap above remains real.
- `docs/api-reference.md` and `docs/db-schema.md` are target-design documents presented as current references. They contain routes, ports, models, fields, and token-version behavior that do not exist in the current source. The current schema has 34 models and 20 migrations, not the inventories stated in those documents.
- `docs/sprint-plan.md` still opens at “Day 0” and leaves shipped Sprint 13 stories 061–063 marked planned. The corresponding story files also retain planned status.
- `docs/audit-2026-07-26-hardening-review.md` correctly records the historical audit, but its old “missing `db:seed:admin` script” finding is superseded by commit `f13963b`; the new script's Prisma construction is now the relevant follow-up.
- `SESSION-HANDOVER.md` contains accurate historical entries but its older snapshots conflict with the current branch. A current addendum is required rather than relying on the first status table in the file.

## Recommended follow-up order

1. Wire authenticated user identity into all graded simulator actions and add ownership tests.
2. Implement and test the three Prisma badge mutations, or disable those admin controls until the adapter is complete.
3. Make `seed-admin-user.mjs` use the shared Prisma adapter path and add a non-destructive smoke test.
4. Choose and implement a session revocation model (`sessions` lookup or token version) and enforce account lockout semantics.
5. Fix first-time impersonation backup handling and add a browser click-through.
6. Replace the dashboard refund placeholder with a real query or label the tile as unavailable.
7. Join quiz lesson content to the dedicated quiz route, and decide whether Keyword Research should become its own simulator module.
8. Run the migration contract test on a POSIX CI runner and install all Playwright browsers before claiming E2E coverage locally.
9. Keep the current docs matrix and audit report updated whenever a story changes the route, schema, or production adapter.

## Documentation changes in this pass

- Added this current-state audit.
- Replaced the feature inventory with implemented, partial, and planned status.
- Updated the README commands, links, and current-state notes.
- Updated architecture diagrams and the route map to match `src/app`.
- Added current-source notices and inventories to the API and schema references.
- Updated the sprint plan, Sprint 13 story status, session handover, changelog, and runbook index.

No application code was changed by this audit.
