-- P0-2 follow-up: PrismaModuleRepository + PrismaLessonRepository (STORY-048b / STORY-048c)
--
-- No Prisma models existed for Module or Lesson, so
-- buildProductionContainer() fell back to InMemoryModuleRepository and
-- InMemoryLessonRepository: every module/lesson created through the admin
-- curriculum editor vanished on cold start / redeploy. The domain
-- entities, ports, use cases, and admin UI (STORY-048b/048c) were already
-- built against these ports; only the Postgres tables and adapters were
-- missing. This does not touch Course.curriculum (still the JSON blob
-- read by the public catalog pages) — that migration is a separate,
-- larger refactor per the STORY-048b/048c "out of scope" notes.

CREATE TABLE "modules" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "displayOrder" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "modules_courseId_idx" ON "modules"("courseId");

CREATE INDEX "lessons_moduleId_idx" ON "lessons"("moduleId");

ALTER TABLE "modules" ADD CONSTRAINT "modules_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "lessons" ADD CONSTRAINT "lessons_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;
