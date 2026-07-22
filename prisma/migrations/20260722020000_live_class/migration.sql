-- P0-2 follow-up: PrismaLiveClassRepository (STORY-050c)
--
-- No Prisma model existed for LiveClass, so buildProductionContainer()
-- fell back to InMemoryLiveClassRepository: every admin-scheduled live
-- class vanished on cold start / redeploy. That silently broke the
-- SendLiveClassReminders cron pipeline too (already backed by a real
-- sent_reminders table for idempotency), since it reads its class list
-- from this same repo.

CREATE TABLE "live_classes" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "instructorId" TEXT NOT NULL,
    "meetingUrl" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "live_classes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "live_classes_courseId_idx" ON "live_classes"("courseId");

CREATE INDEX "live_classes_status_idx" ON "live_classes"("status");

CREATE INDEX "live_classes_scheduledAt_idx" ON "live_classes"("scheduledAt");

ALTER TABLE "live_classes" ADD CONSTRAINT "live_classes_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
