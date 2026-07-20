-- STORY-007: email_verifications table
-- One row per issued verification token. Tokens are SHA-256 hashed
-- before storage. Mark `usedAt` when the user clicks the link.
-- Multiple rows per user are allowed (resend path).

CREATE TABLE "email_verifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_verifications_pkey" PRIMARY KEY ("id")
);

-- Unique on tokenHash so the lookup-by-token path is O(1) and
-- an attacker can't replay a token once it's been used.
CREATE UNIQUE INDEX "email_verifications_tokenHash_key" ON "email_verifications"("tokenHash");

-- Speed up "latest token for user" lookups for the rate-limit
-- and resend paths.
CREATE INDEX "email_verifications_userId_idx" ON "email_verifications"("userId");

-- FK: when a User is deleted, drop their tokens too.
ALTER TABLE "email_verifications"
    ADD CONSTRAINT "email_verifications_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
