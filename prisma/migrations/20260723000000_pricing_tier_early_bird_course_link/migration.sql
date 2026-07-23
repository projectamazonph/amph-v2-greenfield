-- STORY-015: Pricing page + early-bird logic
--
-- 1. Link courses to pricing tiers (nullable FK; backfill via
--    scripts/seed-pricing-tiers.ts after this migration runs).
-- 2. Add early-bird price window to pricing tiers — the /pricing page
--    shows the early-bird price if the window is still open.

-- Step 1: add early-bird columns to pricing_tiers
ALTER TABLE "pricing_tiers" ADD COLUMN IF NOT EXISTS "earlyBirdPriceMinor" INTEGER;
ALTER TABLE "pricing_tiers" ADD COLUMN IF NOT EXISTS "earlyBirdEndsAt" TIMESTAMP;

-- Step 2: add nullable FK on courses
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "pricingTierId" TEXT;

-- Add the FK constraint (PostgreSQL requires separate ALTER for the relation)
ALTER TABLE "courses"
  ADD CONSTRAINT "courses_pricingTierId_fkey"
  FOREIGN KEY ("pricingTierId")
  REFERENCES "pricing_tiers"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Index for lookups
CREATE INDEX IF NOT EXISTS "courses_pricingTierId_idx" ON "courses"("pricingTierId");
