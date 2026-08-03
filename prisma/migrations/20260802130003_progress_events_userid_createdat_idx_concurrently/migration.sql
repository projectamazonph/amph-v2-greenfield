-- prisma-migrate-disable-next-transaction
-- Proposal 7: PrismaProgressEventRepository.findByUserId() filters on
-- userId and sorts by createdAt desc — the existing single-column
-- userId index can't satisfy the sort without an extra step.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "progress_events_userId_createdAt_idx" ON "progress_events"("userId", "createdAt");
