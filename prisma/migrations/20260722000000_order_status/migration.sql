-- P0-2 follow-up: PrismaOrderRepository
--
-- The `orders` table had no column for the domain `PaymentStatus`
-- state machine (DRAFT | PENDING | PAID | FAILED | EXPIRED | REFUNDED).
-- Only `paymongoStatus` existed, which is PayMongo's own vocabulary and has no
-- "DRAFT" equivalent (an order is DRAFT before a PayMongo checkout
-- session even exists). Without this column, orders could not be
-- persisted to Postgres, so production fell back to InMemoryOrderRepository
-- and every order vanished on cold start / redeploy.

ALTER TABLE "orders" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';

-- The index is built in a separate migration
-- (20260722000001_order_status_index_concurrently) using
-- CREATE INDEX CONCURRENTLY, since Prisma wraps this file in a
-- transaction and Postgres refuses CONCURRENTLY inside one. A plain
-- CREATE INDEX here would hold a write lock on `orders` for the
-- build duration: acceptable against an empty/unprovisioned table,
-- not against one taking live checkout/webhook traffic.
