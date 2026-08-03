-- prisma-migrate-disable-next-transaction
-- Proposal 7: PrismaAuditLog.list() paginates with a keyset cursor
-- that compares (createdAt, id) together and sorts by
-- [createdAt desc, id desc] — the existing single-column createdAt
-- index can't fully satisfy the tie-break comparison or the sort.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "audit_logs_createdAt_id_idx" ON "audit_logs"("createdAt", "id");
