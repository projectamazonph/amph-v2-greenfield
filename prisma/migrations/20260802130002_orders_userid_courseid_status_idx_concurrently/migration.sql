-- prisma-migrate-disable-next-transaction
-- Proposal 7: PrismaOrderRepository.findPaidForUserAndCourse() filters
-- on {userId, courseId, status} together — the separate single-column
-- indexes force Postgres to pick one and filter the rest via a heap
-- scan.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_userId_courseId_status_idx" ON "orders"("userId", "courseId", "status");
