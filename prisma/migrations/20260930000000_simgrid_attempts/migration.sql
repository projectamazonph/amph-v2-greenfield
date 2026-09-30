-- ADR-026: SimGrid iframe progress sync
--
-- Persists attempts reported by the vendored SimGrid static site
-- (public/simgrid-v1/) through its postMessage bridge. The bridge
-- only forwards summary rows -- one row per attempt -- so the table
-- is a flat fact table keyed on a ULID.
--
-- Indexed three ways:
--   (userId)            -- per-user history queries
--   (userId, simulatorId) -- best-attempt-per-simulator per user
--   (simulatorId)       -- admin/cross-user simulator analytics

CREATE TABLE "simgrid_attempts" (
    "id"              TEXT        NOT NULL,
    "userId"          TEXT        NOT NULL,
    "simulatorId"     TEXT        NOT NULL,
    "score"           INTEGER     NOT NULL,
    "passed"          BOOLEAN     NOT NULL,
    "completedAt"     TIMESTAMP(3) NOT NULL,
    "scenarioVersion" TEXT        NOT NULL,
    "rubricVersion"   TEXT        NOT NULL,
    "scenarioId"      TEXT,
    "policyVersion"   TEXT,

    CONSTRAINT "simgrid_attempts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "simgrid_attempts_userId_idx"
    ON "simgrid_attempts"("userId");

CREATE INDEX "simgrid_attempts_userId_simulatorId_idx"
    ON "simgrid_attempts"("userId", "simulatorId");

CREATE INDEX "simgrid_attempts_simulatorId_idx"
    ON "simgrid_attempts"("simulatorId");