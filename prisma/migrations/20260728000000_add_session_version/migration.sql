-- Add session revocation counter to users table (STORY-051)
-- Every time an admin revokes all sessions for a user, this counter is incremented.
-- Existing rows get 0 (the @default(0) annotation in the schema).
-- JWT tokens embed the sessionVersion at login time; getSessionUserId
-- rejects any token whose embedded version does not match the current value.
ALTER TABLE "users" ADD COLUMN "currentSessionVersion" INTEGER NOT NULL DEFAULT 0;
