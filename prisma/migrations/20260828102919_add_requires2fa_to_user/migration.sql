-- Add requires2FA field to User model
-- STORY-ops-2fa-enforce / #413

ALTER TABLE "User" ADD COLUMN "requires2FA" BOOLEAN NOT NULL DEFAULT false;
