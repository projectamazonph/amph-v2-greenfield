-- prisma-migrate-disable-next-transaction
-- Proposal 7: PrismaOrderRepository.listRefundRequests() always
-- filters refundRequestedAt IS NOT NULL and sorts by
-- [refundRequestedAt desc, id desc] for keyset pagination — there was
-- no index on refundRequestedAt at all before this.
-- Postgres refuses CREATE INDEX CONCURRENTLY inside a transaction
-- block, so this file opts out of Prisma's default per-migration
-- transaction wrapper and contains only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_refundRequestedAt_id_idx" ON "orders"("refundRequestedAt", "id");
