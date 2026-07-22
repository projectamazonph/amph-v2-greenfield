-- P0-2 follow-up: PrismaSimulatorScenarioRepository (STORY-050b)
--
-- No Prisma model existed for SimulatorScenario, so
-- buildProductionContainer() fell back to
-- InMemorySimulatorScenarioRepository: every admin-created practice
-- scenario vanished on cold start / redeploy.

CREATE TABLE "simulator_scenarios" (
    "id" TEXT NOT NULL,
    "simulatorId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "inputSchema" JSONB NOT NULL,
    "outputSchema" JSONB NOT NULL,
    "difficulty" TEXT NOT NULL,
    "estimatedMinutes" INTEGER NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "simulator_scenarios_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "simulator_scenarios_simulatorId_idx" ON "simulator_scenarios"("simulatorId");

CREATE INDEX "simulator_scenarios_archivedAt_idx" ON "simulator_scenarios"("archivedAt");
