-- STORY-065: Scoring Engine.
--
-- Persists ScorePolicy records used by the GradeSimulatorAttempt and
-- ComposeAttemptFeedback use cases. Each policy applies to one
-- (simulatorId, difficulty, mode) combination and defines how to score
-- a simulator attempt: which dimensions to evaluate, their weights,
-- and the minimum passing score.
--
-- dimensionConfig is stored as JSONB so the Prisma adapter can read
-- and write the dimension weight / threshold map without custom
-- serialization logic.

CREATE TABLE "score_policies" (
    "id" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "dimensionConfig" JSONB NOT NULL,
    "passingScore" INTEGER NOT NULL DEFAULT 70,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "score_policies_pkey" PRIMARY KEY ("id")
);

-- One policy per (simulator, difficulty, mode) combination
CREATE UNIQUE INDEX "score_policies_simulatorId_difficulty_mode_key"
    ON "score_policies"("simulatorId", "difficulty", "mode");

-- Find all policies for a simulator (e.g. list all difficulty levels)
CREATE INDEX "score_policies_simulatorId_idx" ON "score_policies"("simulatorId");
