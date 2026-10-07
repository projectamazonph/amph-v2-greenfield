-- LEARN-052 (STORY-130 follow-up): add optional diagnostic JSON column on users
ALTER TABLE "users" ADD COLUMN "diagnostic" JSONB;
