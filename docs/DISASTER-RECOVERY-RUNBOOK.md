# Disaster Recovery Runbook

**Last updated:** 2026-08-12
**Stack:** Next.js 16 (Vercel), PostgreSQL (Neon), PayMongo, Resend, Upstash Redis, Sentry
**Production:** <https://projectamazonph.vercel.app>

---

## Severity Levels

| Level     | Definition                                   | Response Time |
| --------- | -------------------------------------------- | ------------- |
| **SEV-1** | Complete outage — site unreachable           | 15 min        |
| **SEV-2** | Core functionality broken (payments, auth)   | 1 hour        |
| **SEV-3** | Non-critical feature degraded (email, admin) | 4 hours       |

---

## 1. Database Backup & Restore

### Current State

- **Production provider:** Neon. Backups and point-in-time recovery are managed in the Neon project.
- **No automated backup scripts in the repo.** Confirm the production branch's current retention before an incident.

### Historical Supabase notes

- **Daily backups:** Automatic on Pro plan (7-day retention).
- **Point-in-time recovery (PITR):** Available on Pro+ plan.
- **Restore:** Dashboard → Database → Backups → Choose backup → Restore.
- **Manual backup:** Dashboard → Database → Backups → Create backup.

### Neon

- **Point-in-time recovery:** Automatic on all plans (configurable retention).
- **Restore:** Dashboard → Branches → Create branch → Select timestamp.
- **Manual backup:** `pg_dump` via connection string:
  ```bash
  pg_dump "$DATABASE_URL" > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

### Restore procedure (Neon)

```bash
# 1. Set the target database URL
export DATABASE_URL="postgresql://..."

# 2. Apply all migrations to the fresh database
pnpm prisma:deploy

# 3. Import curriculum content
pnpm import:content

# 4. Seed pricing tiers
pnpm db:seed:tiers

# 5. Verify health check
curl -f https://projectamazonph.vercel.app/api/health/ready
```

---

## 2. Vercel Deployment Rollback

### Immediate Rollback (Hotfix Gone Wrong)

1. Vercel Dashboard → Your Project → Deployments
2. Find the last known good deployment
3. Click ⋯ → "Promote to Production"
4. Verify: `curl -f https://your-domain.com/api/health`

### Rollback via CLI

```bash
vercel promote <deployment-url>
```

### Rollback via Git

```bash
# Revert the last commit
git revert HEAD
git push origin main
# Vercel auto-deploys on push to main
```

---

## 3. Environment Variable Recovery

### If Variables Are Lost/Corrupted

1. Reference `.env.example` for the full variable list.
2. Retrieve secrets from your secrets manager (1Password, Vault, etc.).
3. Set in Vercel Dashboard → Settings → Environment Variables.
4. Redeploy to apply.

### Critical Variables (in priority order)

| Variable                   | Purpose               | Recovery Source             |
| -------------------------- | --------------------- | --------------------------- |
| `DATABASE_URL`             | PostgreSQL connection | Database provider dashboard |
| `JWT_SECRET`               | Session signing       | Secrets manager             |
| `PAYMONGO_SECRET`          | Payment processing    | PayMongo dashboard          |
| `PAYMONGO_WEBHOOK_SECRET`  | Webhook verification  | PayMongo dashboard          |
| `RESEND_API_KEY`           | Transactional email   | Resend dashboard            |
| `SENTRY_DSN`               | Error tracking        | Sentry dashboard            |
| `UPSTASH_REDIS_REST_URL`   | Rate limiting         | Upstash dashboard           |
| `UPSTASH_REDIS_REST_TOKEN` | Rate limiting auth    | Upstash dashboard           |

---

## 4. PayMongo Webhook Re-registration

If webhooks stop receiving events after a domain change or outage:

1. PayMongo Dashboard → Developers → Webhooks
2. Update the endpoint URL to: `https://your-domain.com/api/webhooks/paymongo`
3. Ensure the signing secret matches `PAYMONGO_WEBHOOK_SECRET` in Vercel.
4. Test with PayMongo's "Send test event" feature.
5. Verify: `POST /api/webhooks/paymongo` returns `200 {"received": true}`.

---

## 5. Content Re-import

If curriculum data is corrupted or missing:

```bash
# 1. Apply any pending migrations
pnpm prisma:deploy

# 2. Re-import from content/curriculum/ directory
pnpm import:content

# 3. Re-seed pricing tiers
pnpm db:seed:tiers

# 4. Verify course catalog
curl -f https://your-domain.com/api/health
```

---

## 6. Sentry Recovery

If Sentry stops receiving errors:

1. Verify `SENTRY_DSN` is set in Vercel environment variables.
2. Check Sentry Dashboard → Project Settings → Client Keys.
3. Verify `instrumentation.ts` is present (it is — loads Sentry for both runtimes).
4. Trigger a test error: visit `/api/health` while DB is down → should appear in Sentry.

---

## 7. Upstash Redis Recovery

If rate limiting stops working:

1. Upstash Dashboard → Your Redis instance.
2. Verify `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` are correct.
3. The app gracefully degrades to no rate limiting when Upstash is unreachable (see `UpstashRateLimiter.ts`).
4. No data loss — rate limits are ephemeral by design.

---

## 8. Outage Communication Template

```
Subject: [Project Amazon PH] Service Disruption — [Brief Description]

We're experiencing [issue description]. Our team is actively working on
resolution.

Impact: [What's affected — e.g., course enrollment, payment processing]
Status: Investigating / Identified / Fix in progress / Monitoring
ETA: [Estimated time to resolution or "We'll update in 30 minutes"]

Updates will be posted at: [status page or support channel]
```

---

## 9. Post-Incident Checklist

- [ ] Root cause identified and documented
- [ ] Fix deployed and verified
- [ ] Health check passing: `curl -f https://your-domain.com/api/health`
- [ ] Sentry showing no new errors
- [ ] Webhook events flowing (check PayMongo dashboard)
- [ ] Email delivery working (check Resend dashboard)
- [ ] Affected users notified
- [ ] Incident report written in `docs/incidents/`
