-- LEARN-043 (STORY-143): capstone submission lifecycle.
--
-- DRAFT rows are revisable; SUBMITTED rows are locked for review;
-- PASSED rows are completion evidence (never an employment claim).

CREATE TABLE "capstone_submissions" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "artefactIds" TEXT[] NOT NULL DEFAULT '{}',
  "reviewerNote" TEXT,
  "submittedAt" TIMESTAMP(3),
  "decidedAt" TIMESTAMP(3),
  "decidedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "capstone_submissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "capstone_submissions_userId_idx" ON "capstone_submissions"("userId");

ALTER TABLE "capstone_submissions"
  ADD CONSTRAINT "capstone_submissions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
