ALTER TABLE "courses"
  ADD COLUMN IF NOT EXISTS "courseTier" TEXT NOT NULL DEFAULT 'STARTER',
  ADD COLUMN IF NOT EXISTS "previewLessonCount" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_courseTier_check"
  CHECK ("courseTier" IN ('STARTER', 'PRO', 'PREVIEW'));

ALTER TABLE "courses"
  ADD CONSTRAINT "courses_previewLessonCount_check"
  CHECK ("previewLessonCount" >= 0);
