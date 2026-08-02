-- prisma-migrate-disable-next-transaction
-- Proposal 7: PrismaOrderRepository.listAll({status}) filters by
-- status and sorts by createdAt desc — the existing single-column
-- status index can't satisfy the sort without an extra step.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_status_createdAt_idx" ON "orders"("status", "createdAt");
