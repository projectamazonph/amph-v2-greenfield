-- STORY-086: Simulator grader - instructor calibration ranges.
--
-- Persists one calibration record per (simulatorId, scenarioKey) pair.
-- Instructors tightening the per-dimension grade ranges for a scenario
-- family so the wider umbrella ScorePolicy does not let one dimension
-- accept the full numeric range (the "we'll mark everything fix" failure
-- mode - see STORY-083 for the original defect).
--
-- dimensionBands is stored as JSONB so the Prisma adapter can read and
-- write the dimension -> {minScore, maxScore} map without a custom
-- serializer. Each band is a strict subset of [0, 100] - enforced at
-- the entity factory, not at the schema layer.
--
-- Calibrations are additions to the umbrella score policy, not
-- replacements. GradeSimulatorAttempt clamps per-dimension raw scores
-- into each configured band before calling getOverallScore.

CREATE TABLE "simulator_scenario_calibrations" (
    "id" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,
    "scenarioKey" TEXT NOT NULL,
    "dimensionBands" JSONB NOT NULL,
    "instructorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulator_scenario_calibrations_pkey" PRIMARY KEY ("id")
);

-- One calibration per (simulator, scenarioKey) pair; the upsert path
-- relies on this unique constraint to atomically replace the prior band.
CREATE UNIQUE INDEX "simulator_scenario_calibrations_simulatorId_scenarioKey_key"
    ON "simulator_scenario_calibrations"("simulatorId", "scenarioKey");

-- Lookup calibrations by scenario across simulator families for the
-- "show me every calibration we have" admin view (future use).
CREATE INDEX "simulator_scenario_calibrations_scenarioKey_idx"
    ON "simulator_scenario_calibrations"("scenarioKey");

-- Lookup calibrations by instructor (audit trail across one admin).
CREATE INDEX "simulator_scenario_calibrations_instructorId_idx"
    ON "simulator_scenario_calibrations"("instructorId");
