-- P0-2 follow-up: PrismaOrderRepository
--
-- The `orders` table had no column for the domain `PaymentStatus`
-- state machine (DRAFT | PENDING | PAID | FAILED | EXPIRED | REFUNDED) —
-- only `paymongoStatus`, which is PayMongo's own vocabulary and has no
-- "DRAFT" equivalent (an order is DRAFT before a PayMongo checkout
-- session even exists). Without this column, orders could not be
-- persisted to Postgres, so production fell back to InMemoryOrderRepository
-- and every order vanished on cold start / redeploy.

ALTER TABLE "orders" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';

CREATE INDEX "orders_status_idx" ON "orders"("status");
