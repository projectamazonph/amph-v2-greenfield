-- Add explanation column to quiz_questions table.
-- Shown to the learner after they submit a quiz attempt, whether they
-- got the question right or wrong. Nullable-safe default so existing
-- rows (seeded without an explanation) stay intact.
ALTER TABLE "quiz_questions" ADD COLUMN "explanation" TEXT NOT NULL DEFAULT '';
