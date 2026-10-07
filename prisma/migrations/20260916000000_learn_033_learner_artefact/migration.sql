-- LEARN-033 (STORY-135): structured learner output.
--
-- Private to the owner by default; read by the owner and by admins
-- reviewing a capstone (LEARN-044). DRAFT rows are revisable;
-- SUBMITTED rows are locked at the domain layer.

CREATE TABLE "learner_artefacts" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "courseId" TEXT,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "scenarioRef" TEXT,
  "payload" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "submittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "learner_artefacts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "learner_artefacts_userId_idx" ON "learner_artefacts"("userId");
CREATE INDEX "learner_artefacts_userId_kind_idx" ON "learner_artefacts"("userId", "kind");
CREATE INDEX "learner_artefacts_status_idx" ON "learner_artefacts"("status");

ALTER TABLE "learner_artefacts"
  ADD CONSTRAINT "learner_artefacts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
