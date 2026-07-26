-- Audit hardening: admin TOTP two-factor authentication.
--
-- twoFactorSecret is nullable: null while 2FA has never been enrolled
-- or has been disabled. A non-null secret with twoFactorEnabled=false
-- represents a pending enrollment (secret generated, not yet confirmed
-- with a valid code) — see EnableTwoFactor/ConfirmTwoFactor.

ALTER TABLE "users" ADD COLUMN "twoFactorSecret" TEXT;
ALTER TABLE "users" ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false;
