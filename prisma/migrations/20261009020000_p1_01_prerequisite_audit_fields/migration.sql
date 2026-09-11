-- P1-01 (PR-C slice 1): prerequisites audit columns.
--
-- Every mutable table carries createdById/updatedById (bare nullable
-- TEXT, W0-01 convention). The prerequisites table shipped in W0-01
-- without them; this appends both. Nullable so existing rows (none in
-- practice — the feature never shipped) stay valid.

ALTER TABLE "prerequisites" ADD COLUMN "createdById" TEXT;
ALTER TABLE "prerequisites" ADD COLUMN "updatedById" TEXT;
