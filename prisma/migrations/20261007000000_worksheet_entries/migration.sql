-- Worksheet entries: per-H2, normalized (one row per field value).
--
-- Replaces the deleted Module 1 wide-row worksheet_entries table
-- (Story-163, PR #639). The new shape uses 4 text columns plus a
-- value, one composite unique index, and one supporting index on
-- (studentId, lessonSlug) so the lesson-scoped query is cheap.
--
-- FK to users.id with ON DELETE CASCADE matches LearnerArtefact and
-- the rest of the per-student artifact tables.
--
-- The deleted table used a wide-row shape with 34 nullable columns.
-- No production data was written to redun before deletion (the feature
-- never shipped to a populated environment per the delete commits), so
-- there is no backfill to write here.

CREATE TABLE "worksheet_entries" (
    "id"         TEXT NOT NULL,
    "studentId"  TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "h2Anchor"   TEXT NOT NULL,
    "fieldKey"   TEXT NOT NULL,
    "value"      TEXT NOT NULL,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,
    "deletedAt"  TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "worksheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worksheet_entries_studentId_lessonSlug_h2Anchor_fieldKey_key"
    ON "worksheet_entries"("studentId", "lessonSlug", "h2Anchor", "fieldKey");

CREATE INDEX "worksheet_entries_studentId_idx"
    ON "worksheet_entries"("studentId");

CREATE INDEX "worksheet_entries_studentId_lessonSlug_idx"
    ON "worksheet_entries"("studentId", "lessonSlug");

ALTER TABLE "worksheet_entries"
    ADD CONSTRAINT "worksheet_entries_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;