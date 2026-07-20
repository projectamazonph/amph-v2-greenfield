-- P0-7 follow-up: sent_reminders table
--
-- One row per (liveClassId, userId) pair, recording that a
-- reminder email was sent. The unique constraint on
-- (liveClassId, userId) is the source of truth for idempotency:
-- a second insert with the same pair fails with a unique
-- violation, which the use case treats as "already sent".

CREATE TABLE "sent_reminders" (
    "id" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sent_reminders_pkey" PRIMARY KEY ("id")
);

-- Unique on the (liveClassId, userId) pair. The Prisma model
-- declares this as `@@unique([liveClassId, userId])` so the
-- generated name should be the camelCase combo — but Prisma's
-- default unique index name uses snake_case. Be explicit so the
-- production schema and dev schemas line up.
CREATE UNIQUE INDEX "sent_reminders_liveClassId_userId_key" ON "sent_reminders"("liveClassId", "userId");

-- Index for the "which reminders have I sent for this class?"
-- admin query.
CREATE INDEX "sent_reminders_liveClassId_idx" ON "sent_reminders"("liveClassId");
