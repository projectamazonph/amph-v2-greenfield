-- prisma-migrate-disable-next-transaction
-- P0-2 follow-up: build the `orders.status` index without holding a
-- write lock on `orders` for the duration of the build. Postgres
-- refuses CREATE INDEX CONCURRENTLY inside a transaction block, so
-- this file opts out of Prisma's default per-migration transaction
-- wrapper and — per Prisma's own guidance for this pattern — contains
-- only this one statement.

CREATE INDEX CONCURRENTLY IF NOT EXISTS "orders_status_idx" ON "orders"("status");
