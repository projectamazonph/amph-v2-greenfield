-- STORY-064: Simulator Attempts.
--
-- Persists every simulator session as a SimulatorAttempt record. Each
-- attempt tracks the user, scenario, difficulty, mode, and the full
-- lifecycle: in_progress -> submitted -> graded / expired.
--
-- Decisions made during the attempt are stored separately in
-- SimulatorDecision (one-to-many, cascade delete).
--
-- scoreDimensions is stored as JSONB so the grading use case can write
-- the dimension map directly without serialization helpers. Both score
-- and scoreDimensions are nullable — they remain null until the
-- attempt is graded.

CREATE TABLE "simulator_attempts" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "scenarioVersion" INTEGER NOT NULL DEFAULT 1,
    "difficulty" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'practice',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "seed" TEXT,
    "score" INTEGER,
    "scoreDimensions" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),

    CONSTRAINT "simulator_attempts_pkey" PRIMARY KEY ("id")
);

-- Human-readable attempt ID (shown to user, used in URLs)
CREATE UNIQUE INDEX "simulator_attempts_attemptId_key" ON "simulator_attempts"("attemptId");

-- Find all attempts for a user (dashboard, progress)
CREATE INDEX "simulator_attempts_userId_idx" ON "simulator_attempts"("userId");

-- Find all attempts for a simulator
CREATE INDEX "simulator_attempts_simulatorId_idx" ON "simulator_attempts"("simulatorId");

-- Filter by status (e.g. find graded attempts awaiting feedback)
CREATE INDEX "simulator_attempts_status_idx" ON "simulator_attempts"("status");

-- Compound index for the "user's attempts on this simulator" query
CREATE INDEX "simulator_attempts_userId_simulatorId_status_idx"
    ON "simulator_attempts"("userId", "simulatorId", "status");
