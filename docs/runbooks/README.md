# Runbooks — Project Amazon PH Academy v2

**Date:** 2026-07-17 (greenfield; runbooks authored as their respective sprints ship)

This index lists the runbooks for the production system. Each runbook is a step-by-step procedure an operator follows when something needs attention. Runbooks are written for the on-call engineer at 2am, not for the developer who built the system.

The greenfield rebuild is sprint 1, so most runbooks are placeholders. They get authored when the underlying system ships (Sprint 4 for PayMongo, Sprint 9 for certificates, Sprint 12 for launch). This index will be updated as runbooks land.

## Production

| Runbook | Status | When to use |
|---------|--------|-------------|
| `production-deploy.md` | Stub — authored in Sprint 12 / STORY-056 | When deploying a new version to production |
| `db-backup-restore.md` | Stub — authored in Sprint 12 / STORY-057 | When restoring the database from a backup |
| `incident-response.md` | Stub — authored in Sprint 12 | When paged for an incident |
| `paymongo-outage.md` | Stub — authored in Sprint 4 | When PayMongo is degraded or down |
| `email-outage.md` | Stub — authored in Sprint 9 | When Resend is degraded or down |

## Operations

| Runbook | Status | When to use |
|---------|--------|-------------|
| `refund-processing.md` | Stub — authored in Sprint 5 | When a refund fails or times out |
| `user-impersonation.md` | Stub — authored in Sprint 10 | When a super-admin needs to impersonate a user |
| `discount-code-rollback.md` | Stub — authored in Sprint 5 | When a discount code needs to be revoked after use |
| `live-class-cancellation.md` | Stub — authored in Sprint 8 | When a live class needs to be cancelled and RSVPs refunded |
| `content-rollback.md` | Stub — authored in Sprint 6 | When a lesson edit needs to be rolled back |

## Security

| Runbook | Status | When to use |
|---------|--------|-------------|
| `credential-rotation.md` | Stub — authored in Sprint 12 | When rotating `JWT_SECRET`, `PAYMONGO_SECRET`, etc. |
| `suspicious-activity.md` | Stub — authored in Sprint 11 | When the audit log shows suspicious admin actions |
| `data-export-request.md` | Stub — authored in Sprint 12 | When a user requests a full data export |
| `account-deletion.md` | Stub — authored in Sprint 12 | When a user requests account deletion |

## How a Runbook Is Structured

Each runbook follows this template:

```markdown
# <Runbook title>

**Severity:** <P0 | P1 | P2>
**Owner:** <role>
**Last reviewed:** <YYYY-MM-DD>

## Symptoms
What you see (alerts, user reports, dashboards).

## Diagnosis
Steps to confirm the issue. Include commands to run.

## Mitigation
Immediate steps to stop the bleeding. Order matters.

## Resolution
Steps to fully resolve. May take hours.

## Verification
How to confirm the issue is fixed.

## Postmortem
Required for P0 and P1. Schedule within 48h.
```

## Authoring a New Runbook

When you write a runbook, you should:

1. Test it. Have someone else follow the steps on a staging environment.
2. Time it. If a P0 runbook takes longer than 15 minutes, simplify.
3. Update this index. Add the runbook to the right table.
4. Cross-link from `SESSION-HANDOVER.md` if the runbook is operator-side.

## Related

- `docs/sprint-plan.md` — sprint-by-sprint plan
- `docs/admin-backend.md` — admin panel structure
- `docs/security/tenant-isolation.md` — tenant isolation audit
- `docs/decisions.md` — architectural decisions
