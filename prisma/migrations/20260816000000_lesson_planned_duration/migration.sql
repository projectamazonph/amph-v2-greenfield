-- LEARN-002: make source-planned learner time durable for every lesson type.
ALTER TABLE "lessons" ADD COLUMN "plannedMinutes" INTEGER NOT NULL DEFAULT 0;

-- Preserve the existing video duration estimate for rows created before this
-- column existed. Text and quiz rows remain 0 until their source content is
-- re-imported with frontmatter estimatedMinutes.
UPDATE "lessons"
SET "plannedMinutes" = ("content"->>'durationMinutes')::integer
WHERE "type" = 'VIDEO'
  AND jsonb_typeof("content"->'durationMinutes') = 'number'
  AND ("content"->>'durationMinutes') ~ '^[0-9]+$';
