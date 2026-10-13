-- LEARN-050: associate downloadable resources with the lesson they
-- support, so the resource center can surface "this resource is for
-- Lesson X" on the listing page and so the future "lessons teach this"
-- badge in the learning home (LEARN-053) has a real field to read.
--
-- Nullable on purpose: not every resource has a single anchor lesson
-- (some are cross-cutting, like the weekly client report). Bare
-- string for the slug, no FK relation, because the curriculum lives
-- in MDX and is not represented in the Prisma schema. The download
-- route does not need to validate the slug exists; a missing anchor
-- just means the lesson badge shows nothing, not an error.
--
-- No backfill. The first 6 LEARN-050 rows will be inserted with this
-- field populated, and the existing rows stay null.
--
-- One supporting index on (associatedLessonSlug) so the future
-- "lessons that link here" join (LEARN-051 capability map) is cheap
-- when we wire it.

ALTER TABLE "resources" ADD COLUMN "associatedLessonSlug" TEXT;

CREATE INDEX "resources_associatedLessonSlug_idx" ON "resources"("associatedLessonSlug");
