-- Add coverImage column to modules table.
-- Nullable, no default, so existing rows stay intact (matches the
-- Course.coverImage column this mirrors).
ALTER TABLE "modules" ADD COLUMN "coverImage" TEXT;
