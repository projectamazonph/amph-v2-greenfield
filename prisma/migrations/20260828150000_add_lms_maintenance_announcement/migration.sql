-- Migration for LMS Maintenance and Announcement models
-- P1-07: Site-wide announcement banner
-- P1-08: Maintenance mode / kill switch

-- Create Announcement table
CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'info',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startAt" TIMESTAMPTZ,
    "endAt" TIMESTAMPTZ,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Create indexes for Announcement
CREATE INDEX "announcements_isActive_idx" ON "announcements"("isActive");
CREATE INDEX "announcements_startAt_idx" ON "announcements"("startAt");
CREATE INDEX "announcements_endAt_idx" ON "announcements"("endAt");

-- Create Maintenance table
CREATE TABLE "maintenance" (
    "id" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "message" TEXT,
    "startAt" TIMESTAMPTZ,
    "endAt" TIMESTAMPTZ,
    "createdById" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY ("id")
);

-- Create index for Maintenance
CREATE INDEX "maintenance_isActive_idx" ON "maintenance"("isActive");
