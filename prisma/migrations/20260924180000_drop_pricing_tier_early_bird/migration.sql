-- Migration: drop early-bird pricing from pricing_tiers
--
-- Decision 6 (2026-09-24) drops the early-bird mechanism entirely.
-- Each tier now has exactly one price; the time-windowed discount
-- is gone, along with the /pricing countdown UI.
--
-- This is a forward-only schema change. Production migrations have
-- already been applied; running this migration drops the two
-- early-bird columns. Existing rows lose their early-bird price
-- (no other columns are affected).
--
-- The follow-up application code (PR #612) removes the entity
-- fields, the Prisma adapter mapping, and the public pricing
-- page rendering of the badge and countdown.

ALTER TABLE "pricing_tiers" DROP COLUMN IF EXISTS "earlyBirdEndsAt";
ALTER TABLE "pricing_tiers" DROP COLUMN IF EXISTS "earlyBirdPriceMinor";
