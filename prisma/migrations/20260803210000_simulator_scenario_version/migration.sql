-- STORY-085: real scenario versioning. SimulatorAttempt.scenarioVersion
-- has existed since STORY-064 but StartSimulatorAttempt hardcoded it to
-- the literal 1 -- it never reflected the scenario's actual edit
-- history. This column is the source of truth UpdateSimulatorScenario
-- now increments on every edit. Existing rows default to 1, matching
-- the version every already-persisted scenario has effectively been at
-- since creation.

ALTER TABLE "simulator_scenarios" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
