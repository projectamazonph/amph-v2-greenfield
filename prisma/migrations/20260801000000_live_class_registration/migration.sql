-- STORY-091: Live-class RSVP for students
--
-- Adds the live_class_registrations table to persist which students
-- RSVP'd to which live class. Without this, students had no way to
-- indicate attendance intent; admins had no list of registered students.
--
-- Unique (userId, liveClassId) prevents double-RSVP.

CREATE TABLE "live_class_registrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "liveClassId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registered',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_class_registrations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "live_class_registrations_userId_liveClassId_key"
    ON "live_class_registrations"("userId", "liveClassId");

CREATE INDEX "live_class_registrations_userId_idx"
    ON "live_class_registrations"("userId");

CREATE INDEX "live_class_registrations_liveClassId_idx"
    ON "live_class_registrations"("liveClassId");

ALTER TABLE "live_class_registrations"
    ADD CONSTRAINT "live_class_registrations_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "live_class_registrations"
    ADD CONSTRAINT "live_class_registrations_liveClassId_fkey"
    FOREIGN KEY ("liveClassId") REFERENCES "live_classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
