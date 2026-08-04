-- Review follow-up on STORY-098/098.5: Resource had no deletedAt,
-- createdById, or updatedById despite supporting soft delete (via
-- isPublished) and hard delete. Bare String actor ids, no FK relation --
-- same treatment as email_templates.updatedById, the only existing
-- precedent in this schema for a "who did this" column.

ALTER TABLE "resources" ADD COLUMN "deletedAt" TIMESTAMP(3);
ALTER TABLE "resources" ADD COLUMN "createdById" TEXT;
ALTER TABLE "resources" ADD COLUMN "updatedById" TEXT;
