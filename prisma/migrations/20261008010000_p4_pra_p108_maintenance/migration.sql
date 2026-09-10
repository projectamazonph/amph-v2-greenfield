-- P1-08 (P4 PR-A commit 2 of 3) -- maintenance mode / kill switch.
--
-- A single-row table that stores the current maintenance-mode toggle.
-- Keyed by a stable string id ("current") because there is at most one
-- active maintenance setting at a time. Using a single-row pattern
-- instead of key/value `Setting` rows so the schema is self-describing
-- (typed `enabled` column, dedicated `message` + `allowedAdminIds`
-- columns) and so future extensions -- e.g. scheduled maintenance
-- windows -- have a place to land without a follow-on migration.
--
-- Allowed admin ids are stored as a string[] of cuid-style user ids.
-- The middleware honours both this list and the MAINTENANCE_BYPASS_TOKEN
-- env override so an admin can still reach /admin even when the app
-- itself is locked.
--
-- Schema guards follow the repo's `mutable table has audit fields`
-- rule (AGENTS.md) -- `createdById` / `updatedById` are nullable
-- because the very first row will be written by the system seeding
-- later, with no human actor.

CREATE TABLE "maintenance_settings" (
    "id"              TEXT        NOT NULL,
    "enabled"         BOOLEAN     NOT NULL DEFAULT false,
    "message"         TEXT,
    "allowedAdminIds" TEXT[]      NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    "deletedAt"       TIMESTAMP(3),
    "createdById"     TEXT,
    "updatedById"     TEXT,

    CONSTRAINT "maintenance_settings_pkey" PRIMARY KEY ("id")
);