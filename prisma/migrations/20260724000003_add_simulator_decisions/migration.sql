-- STORY-064: Simulator Attempts.
--
-- Persists each decision made within a SimulatorAttempt. Decisions are
-- versioned (revision field) so users can revise their answer before
-- submitting. The latest revision is the authoritative one for grading.
--
-- decisionData is stored as JSONB so the simulator domain can write
-- arbitrary decision payload without schema changes.

CREATE TABLE "simulator_decisions" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "decisionData" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "simulator_decisions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "simulator_decisions_attemptId_revision_key"
        UNIQUE ("attemptId", "revision")
);

-- FK: deleting an attempt cascades all its decisions
ALTER TABLE "simulator_decisions"
    ADD CONSTRAINT "simulator_decisions_attemptId_fkey"
        FOREIGN KEY ("attemptId")
        REFERENCES "simulator_attempts"("id")
        ON DELETE CASCADE;
