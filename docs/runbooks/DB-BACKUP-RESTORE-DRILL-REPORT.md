# Database Backup & Restore Drill Report

**Issue:** #414 - Drill the database backup & restore runbook against live Neon  
**Date:** [To be filled during actual drill]  
**Conducted by:** [Team member name]  
**Status:** Planned (runbook verified, actual drill pending live execution)

---

## Executive Summary

This document serves as both:
1. A **drill report template** for when the actual drill is executed against Neon
2. A **verification** that the existing runbook (`docs/DISASTER-RECOVERY-RUNBOOK.md`) is complete and actionable

The runbook has been **reviewed and found sufficient** for execution. The actual drill must be scheduled and executed to validate RPO/RTO targets.

---

## Pre-Drill Checklist

- [ ] Maintenance window scheduled with all stakeholders
- [ ] Stakeholders notified: Engineering, Operations, Product
- [ ] Rollback plan documented
- [ ] Monitoring in place (Sentry, Vercel logs)
- [ ] Backup verification completed
- [ ] Team available for duration of drill

---

## Drill Execution Plan

### Phase 1: Pre-Drill Setup (15 minutes)

1. **Create a Neon branch from production**
   ```bash
   # In Neon dashboard: Branches → Create Branch
   # Name: amph-drill-2026-08-28
   # Source: production
   ```

2. **Verify branch connection**
   ```bash
   psql "$NEON_DRILL_DATABASE_URL"
   SELECT count(*) FROM "User";
   ```

3. **Record start time**
   ```
   DRILL_START=$(date -u +%Y-%m-%dT%H:%M:%SZ)
   ```

### Phase 2: Execute Backup (10 minutes)

1. **Use Neon's built-in PITR**
   - Neon automatically creates restore points
   - No manual backup needed for this drill
   - Verify: Dashboard → Branches → amph-drill-2026-08-28 → Restore points exist

2. **Manual pg_dump backup (for validation)**
   ```bash
   pg_dump "$NEON_DRILL_DATABASE_URL" > drill_backup_$(date +%Y%m%d_%H%M%S).sql
   ```

3. **Verify backup integrity**
   ```bash
   # Check file exists and has content
   ls -lh drill_backup_*.sql
   head -20 drill_backup_*.sql  # Should show CREATE TABLE statements
   ```

### Phase 3: Simulate Disaster (5 minutes)

1. **Drop all tables in the drill branch**
   ```bash
   psql "$NEON_DRILL_DATABASE_URL" <<EOF
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   EOF
   ```

2. **Verify data is gone**
   ```bash
   psql "$NEON_DRILL_DATABASE_URL" -c "SELECT count(*) FROM "User"" 2>&1 | grep -q "does not exist" && echo "DATA CONFIRMED LOST"
   ```

### Phase 4: Restore from Backup (15 minutes)

1. **Apply migrations to fresh database**
   ```bash
   DATABASE_URL="$NEON_DRILL_DATABASE_URL" pnpm prisma:migrate
   ```

2. **Restore from pg_dump**
   ```bash
   psql "$NEON_DRILL_DATABASE_URL" < drill_backup_*.sql
   ```

3. **OR: Use Neon PITR (preferred)**
   - Dashboard → Branches → amph-drill-2026-08-28 → Restore to timestamp
   - Select timestamp just before the DROP SCHEMA command
   - This creates a new branch with the restored data

### Phase 5: Verify Restoration (10 minutes)

1. **Verify all tables exist**
   ```bash
   psql "$NEON_DRILL_DATABASE_URL" -c "\dt"
   ```

2. **Verify row counts match pre-drill**
   ```bash
   # Compare with pre-drill counts (recorded before Phase 3)
   psql "$NEON_DRILL_DATABASE_URL" <<EOF
   SELECT 'User' as table, count(*) FROM "User"
   UNION ALL SELECT 'Course', count(*) FROM "Course"
   UNION ALL SELECT 'Enrollment', count(*) FROM "Enrollment";
   EOF
   ```

3. **Verify application starts**
   ```bash
   # Deploy a temporary instance pointing to the drill branch
   DATABASE_URL="$NEON_DRILL_DATABASE_URL" pnpm dev
   # Visit http://localhost:3000 and verify pages load
   ```

### Phase 6: Record Metrics (5 minutes)

1. **Record RPO (Recovery Point Objective)**
   - Time between last backup and disaster: [X] minutes
   - Data loss: [Y] records (should be 0 for PITR)

2. **Record RTO (Recovery Time Objective)**
   - Start of drill: $DRILL_START
   - End of restoration: $(date -u +%Y-%m-%dT%H:%M:%SZ)
   - Total RTO: [Z] minutes

3. **Document deviations from runbook**
   - Step [N] in runbook was unclear: [Description]
   - Step [M] required additional tooling: [Description]
   - Any manual interventions needed: [Description]

---

## Drill Report Template (To be filled during actual execution)

```
Drill Date: _______________
Drill Duration: _______________
Participants: _______________

### Metrics
- RPO Achieved: _____ minutes (Target: <5 minutes)
- RTO Achieved: _____ minutes (Target: <15 minutes)
- Data Loss: _____ records (Target: 0)

### Runbook Deviations
| Step | Issue | Resolution | Follow-up Action |
|------|-------|------------|-----------------|
| | | | |

### Lessons Learned
1. 
2. 
3. 

### Follow-up Issues Created
- [ ] #____ - [Title]

### Sign-off
Drill Conducted By: _______________  
Drill Verified By: _______________  
Date: _______________
```

---

## Current Status

✅ **Runbook exists** at `docs/DISASTER-RECOVERY-RUNBOOK.md`  
✅ **Runbook covers Neon** (Section 1. Database Backup & Restore)  
✅ **Neon PITR is available** on all plans  
❌ **Drill not yet executed** against live Neon branch  

## Next Steps

1. **Schedule the drill** with stakeholders (1-2 hours window)
2. **Execute the drill** using the plan above
3. **Record metrics** in this document
4. **File follow-up issues** for any gaps discovered
5. **Commit the completed report** to `docs/runbooks/`

---

## References

- Issue: https://github.com/projectamazonph/amph-v2-greenfield/issues/414
- Runbook: `docs/DISASTER-RECOVERY-RUNBOOK.md`
- Neon Docs: https://neon.tech/docs
