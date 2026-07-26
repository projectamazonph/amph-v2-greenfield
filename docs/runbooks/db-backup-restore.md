# Database Backup / Restore

**Severity:** P0
**Owner:** Operator (Neon project owner) + on-call engineer
**Last reviewed:** 2026-07-26

**This runbook has not been drilled end-to-end.** `docs/sprint-plan.md` (STORY-057) flags this explicitly: "Neon has automatic backups, drill not yet run." Everything below is the correct mechanism per Neon's platform (point-in-time recovery via branching — there is no separate `pg_dump`-based backup job in this repo; grep found none), but treat the exact retention window and step-by-step timing as unverified until someone actually runs this against a non-production Neon project.

## Symptoms

- Data corruption from a bad migration, a bug that wrote incorrect data, or an accidental destructive query run directly against production.
- A specific point-in-time state needs to be recovered (e.g. "restore orders to how they looked before 14:32 UTC").
- Full database loss (Neon project deleted, credentials compromised and rotated without migrating data first — should not happen, but is the worst case this runbook must also cover).

## Diagnosis

1. Confirm this is actually a data problem, not an application bug that merely displays data wrong — check recent deploys and `AuditLog` entries first (`docs/api-reference.md` for the audit log query shape; `src/usecases/ListAuditLogs.ts` / the admin audit log viewer at `/admin/audit-log`). A restore is destructive and should not be the first tool reached for.
2. Identify the exact timestamp to restore to. Prefer the earliest point that's clearly before the bad write — a restore too early loses legitimate data, one too late keeps the corruption.
3. Confirm which Neon project/branch is production: check `DATABASE_URL` in Vercel's production environment variables (Settings → Environment Variables) to identify the exact Neon connection string / branch, since a Neon project can have multiple branches.
4. Log into the [Neon console](https://console.neon.tech) for the project and check **Restore** (or **Branches** → **Restore to a point in time**, naming varies by console version) to confirm the point-in-time window actually covers your target timestamp — Neon's PITR retention is plan-dependent and this project's current retention has not been verified against this runbook. If the target timestamp is outside the retention window, PITR cannot help — fall back to the most recent available restore point and manually replay any missing writes from `AuditLog`/`webhook_events`/PayMongo's own transaction history where possible.

## Mitigation

1. **Do not restore production in place first.** Neon's restore-to-point-in-time creates a new branch from the target timestamp — it does not destructively rewrite the existing branch. Use that: create the restore branch, verify it, _then_ decide whether to promote it to replace production.
2. If the corruption is actively ongoing (e.g. a runaway script), stop it first — revoke its credentials or kill the process before it writes more bad data, so the eventual restore point is clean.
3. If production is actively serving broken data to users and waiting for a full restore+verify cycle isn't acceptable, consider taking the affected feature offline (e.g. disable checkout via a feature flag / maintenance page) rather than restoring under time pressure.

## Resolution

1. In the Neon console, create a new branch restored to the chosen point in time from the production branch.
2. Get the new branch's connection string. Point a **local** `DATABASE_URL` at it (never point Vercel production at an unverified restore branch directly) and sanity-check:
   ```bash
   DATABASE_URL="<restore branch connection string>" pnpm prisma migrate status
   ```
   This confirms the restored branch's migration history matches `prisma/migrations/` — a mismatch here means the restore point predates a migration that's since been applied, and the branch needs `pnpm prisma migrate deploy` run against it before the app can use it.
3. Spot-check the data that motivated the restore (the specific rows/tables from the Diagnosis step) directly via `psql` or `pnpm prisma studio` against the restore branch.
4. Once verified, there are two ways to make it live — pick based on how much downtime is acceptable:
   - **Branch promotion** (Neon-native, minimal downtime): use Neon's branch-swap/promote feature if available on this project's plan, so the restore branch becomes the new production branch without changing the connection string Vercel uses.
   - **Manual cutover**: update `DATABASE_URL` (and `SHADOW_DATABASE_URL` if changed) in Vercel's production environment variables to point at the restore branch's connection string, then redeploy. This causes a brief outage during the env var change + redeploy.
5. After cutover, run `pnpm prisma migrate deploy` against the now-production `DATABASE_URL` as a final safety check (a no-op if already up to date).

## Verification

- `GET /api/health` returns healthy against the restored/promoted database.
- Smoke test the golden path: `/`, `/login`, a course page, `/dashboard` for a known test account.
- Spot-check the specific records that motivated the restore.
- Confirm `webhook_events` and `orders` around the restore boundary look consistent — a restore can leave an order `PENDING` if its `PAID` transition happened after the restore point; reconcile those against PayMongo's dashboard using the same procedure as `docs/runbooks/paymongo-outage.md`.

## Postmortem

Required (P0). Cover: what caused the need for restore, the exact data loss window (writes between the restore point and the incident are gone unless manually replayed), and — since this runbook has never been drilled — whether the actual steps above matched what the Neon console presented. **File a follow-up to run a real drill against a non-production Neon branch** if this incident was the first time anyone actually executed this procedure; update this doc with what was actually observed (exact button labels, retention window, timing) once drilled.
