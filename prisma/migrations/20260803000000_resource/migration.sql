-- STORY-098: download center (guides, templates, automation tools,
-- client reporting templates, monitoring sheets, audit templates,
-- student handouts, cheat sheets, quick guides).
--
-- No file-storage/blob layer exists in this codebase yet, so a
-- Resource row is metadata + an externally-hosted fileUrl (Google
-- Drive/Sheets or a public asset URL), not the file bytes themselves.

CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "accessTier" TEXT NOT NULL DEFAULT 'PREVIEW',
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resources_category_idx" ON "resources"("category");

CREATE INDEX "resources_isPublished_idx" ON "resources"("isPublished");

CREATE INDEX "resources_accessTier_idx" ON "resources"("accessTier");
