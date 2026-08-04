-- STORY-085: scenario publishing + versioning.
--
-- Adds a lifecycle (draft | published | archived) and version history to
-- simulator_scenarios. `scenarioKey` groups every version of "the same"
-- scenario together; `status` is the primary lifecycle signal going
-- forward (archivedAt is kept for its existing index but superseded).
--
-- Every existing row becomes its own scenarioKey family at version 1,
-- status 'published' — matching current behavior exactly (today's rows
-- are all immediately "live").

ALTER TABLE "simulator_scenarios" ADD COLUMN "scenarioKey" TEXT;
ALTER TABLE "simulator_scenarios" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "simulator_scenarios" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published';

UPDATE "simulator_scenarios" SET "scenarioKey" = "id" WHERE "scenarioKey" IS NULL;

ALTER TABLE "simulator_scenarios" ALTER COLUMN "scenarioKey" SET NOT NULL;

CREATE INDEX "simulator_scenarios_scenarioKey_idx" ON "simulator_scenarios"("scenarioKey");

CREATE INDEX "simulator_scenarios_status_idx" ON "simulator_scenarios"("status");
