-- AlterTable
ALTER TABLE "users" ADD COLUMN     "welcomeCompletedAt" TIMESTAMP(3);

-- Backfill: existing users are treated as already-toured so the
-- dashboard variant doesn't appear for them.
UPDATE "users"
SET "welcomeCompletedAt" = "createdAt"
WHERE "welcomeCompletedAt" IS NULL;
