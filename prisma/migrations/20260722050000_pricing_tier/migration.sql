-- STORY-011: PricingTier model + repository.
--
-- No Prisma model existed for PricingTier, so the public pricing page
-- (STORY-015) and the future Course.pricingTierId FK have no table to
-- read from. The domain entity, port, and use cases are designed
-- against this table; only the migration was missing.
--
-- The table is brand new, so a plain `CREATE INDEX` (not CONCURRENTLY)
-- is correct here: no existing data or traffic on a table that doesn't
-- exist yet, same as every index in the original baseline migration.
-- The compound index on (status, displayOrder) supports both
-- `listAll()` (status != ARCHIVED, ordered) and `listActive()` (status
-- = ACTIVE, ordered) without a separate index per query.
--
-- This migration does NOT add `Course.pricingTierId` or
-- `Enrollment.pricingTierId` foreign keys. Those are a separate,
-- larger refactor (breaking change to checkout, needs a backfill
-- strategy + an order-pricing snapshot pattern); see
-- `docs/sprint-3/PLAN.md` and `docs/stories/STORY-015.md`.

CREATE TABLE "pricing_tiers" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pricing_tiers_pkey" PRIMARY KEY ("id")
);

-- Slug uniqueness is enforced both via a UNIQUE constraint on the
-- column (handled by Prisma's @unique) and via a separate named
-- index for queryability / explicit error mapping in the adapter.
CREATE UNIQUE INDEX "pricing_tiers_slug_key" ON "pricing_tiers"("slug");

-- Compound index for the public-facing list queries. The
-- "listAll()" query filters `status != 'ARCHIVED'` and orders by
-- `displayOrder` ascending; the "listActive()" query filters
-- `status = 'ACTIVE'` with the same order. Both benefit from the
-- (status, displayOrder) index.
CREATE INDEX "pricing_tiers_status_displayOrder_idx" ON "pricing_tiers"("status", "displayOrder");
