-- P0-2 follow-up: PrismaDiscountCodeRepository admin CRUD (STORY-050d)
--
-- listAll/findById/update/archive were stubs (throw "Not implemented")
-- because the `discount_codes` table had no way to represent "archived"
-- (soft-deleted). InMemoryDiscountCodeRepository tracks this with a
-- separate in-process Set, which has no Postgres equivalent. Adding a
-- nullable archivedAt timestamp: null means active, a timestamp means
-- archived (and when).

ALTER TABLE "discount_codes" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- The index is built in a separate migration
-- (20260722010001_discount_code_archived_at_index_concurrently) using
-- CREATE INDEX CONCURRENTLY, since discount_codes takes writes during
-- checkout (incrementUsedCount) and a plain CREATE INDEX here would hold
-- a write lock on it for the build duration.
