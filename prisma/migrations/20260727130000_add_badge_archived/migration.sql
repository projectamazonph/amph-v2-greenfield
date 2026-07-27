-- Add archived column to badges table (STORY-050e follow-up)
-- Nullable with default so existing rows stay intact.
ALTER TABLE "badges" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;
