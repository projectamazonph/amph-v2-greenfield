-- Add a durable idempotency key for XP awards. Existing rows receive a
-- legacy key derived from their immutable primary key so no historical event
-- is collapsed or lost during the migration.
ALTER TABLE "xp_events" ADD COLUMN "awardKey" TEXT;

UPDATE "xp_events"
SET "awardKey" = 'legacy:' || "id"
WHERE "awardKey" IS NULL;

ALTER TABLE "xp_events" ALTER COLUMN "awardKey" SET NOT NULL;

CREATE UNIQUE INDEX "xp_events_awardKey_key" ON "xp_events"("awardKey");
