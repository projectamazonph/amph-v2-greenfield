-- LEARN-041 (STORY-141): quiz remediation tags.
--
-- Empty array = no remediation authored; the question still scores.
-- The release gate (LEARN-005) does not require every question to
-- carry tags, so the default is `[]` rather than NOT NULL.

ALTER TABLE "quiz_questions"
  ADD COLUMN "remediationRefs" JSONB NOT NULL DEFAULT '[]'::jsonb;
