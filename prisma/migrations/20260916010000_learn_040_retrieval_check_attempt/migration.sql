-- LEARN-040 (STORY-138): mid-lesson retrieval check attempts.
--
-- Append-only log. The SelfCheck UI never blocks on a write; a
-- failed record call is swallowed client-side. Read by LEARN-041
-- (targeted remediation) and LEARN-060 (learning events).

CREATE TABLE "retrieval_check_attempts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "lessonSlug" TEXT NOT NULL,
  "checkId" TEXT NOT NULL,
  "correct" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "retrieval_check_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "retrieval_check_attempts_userId_idx" ON "retrieval_check_attempts"("userId");
CREATE INDEX "retrieval_check_attempts_userId_lessonSlug_idx" ON "retrieval_check_attempts"("userId", "lessonSlug");

ALTER TABLE "retrieval_check_attempts"
  ADD CONSTRAINT "retrieval_check_attempts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
