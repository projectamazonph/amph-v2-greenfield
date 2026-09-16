-- P3-87 (STORY-139): in-app notifications.
--
-- Owner-scoped reads; the bell polls list. Emits originate in
-- server actions (course completion today; refunds and enrollments
-- in follow-ups).

CREATE TABLE "notifications" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "href" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

ALTER TABLE "notifications"
  ADD CONSTRAINT "notifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
