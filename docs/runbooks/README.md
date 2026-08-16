# Production runbooks

**Reviewed:** 2026-08-16
**Source of truth:** files present under `docs/runbooks/`.

A row is marked **authored** only when the corresponding file exists. The remaining procedures are planned topics, not runnable instructions.

## Authored runbooks

| File                       | Status                           | Use when                                                          |
| -------------------------- | -------------------------------- | ----------------------------------------------------------------- |
| `paymongo-outage.md`       | Reviewed 2026-08-12              | PayMongo is degraded or a paid order did not produce access       |
| `webhook-replay.md`        | Reviewed 2026-08-12              | A PayMongo event needs inspection or replay                       |
| `db-backup-restore.md`     | Reviewed 2026-08-12, not drilled | A Neon database restore is required                               |
| `admin-access-recovery.md` | Reviewed 2026-08-12              | No usable admin account exists or an admin account is compromised |
| `simulator-scenario-missing.md` | Reviewed 2026-08-16          | `/api/health/ready` returns 503 `missing_scenarios`; simulators render "Something went wrong" |

The database restore procedure has not been exercised against a real backup. Treat its timing and operator commands as unverified until a staging drill is completed.

## Planned runbook topics

These names are referenced by the historical sprint plan but do not currently exist as files:

- `production-deploy.md`
- `incident-response.md`
- `email-outage.md`
- `refund-processing.md`
- `user-impersonation.md`
- `discount-code-rollback.md`
- `live-class-cancellation.md`
- `content-rollback.md`
- `credential-rotation.md`
- `suspicious-activity.md`
- `data-export-request.md`
- `account-deletion.md`

Do not link a planned topic as an executable procedure. Add the file, test it in a non-production environment, and update this index when it is ready.

## Operational notes

- The live-class reminder route requires `CRON_SECRET` and is scheduled in `vercel.json` at `0 8 * * *` (daily).
- `SentReminder` persistence makes reminder sends idempotent.
- `/api/health` is a liveness response and does not query Postgres.
- `/api/health/ready` is a readiness probe; in production it also asserts every registered simulator has a published `SimulatorScenario` row, returning 503 `missing_scenarios` if any are absent (see `simulator-scenario-missing.md`).
- Session-table deletion revokes JWT-backed sessions that carry a `sessionId`; login enforces `lockedUntil`. See `admin-access-recovery.md`.
- The admin seed command is `pnpm db:seed:admin`; its Prisma 7 adapter compatibility is a tracked follow-up in the completeness audit.

## Runbook template

```markdown
# <Runbook title>

**Severity:** <P0 | P1 | P2>
**Owner:** <role>
**Last reviewed:** <YYYY-MM-DD>

## Symptoms

## Diagnosis

## Mitigation

## Resolution

## Verification

## Postmortem
```

Every new runbook must be followed in staging or a local disposable environment before being called operationally ready.

## Related documents

- `docs/audit-2026-07-27-completeness-review.md`
- `docs/sprint-plan.md`
- `docs/security/tenant-isolation.md`
- `docs/decisions.md`
- `SESSION-HANDOVER.md`
