-- STORY-098: download center (guides, templates, automation tools,
-- client reporting templates, monitoring sheets, audit templates,
-- student handouts, cheat sheets, quick guides).
--
-- A Resource row is metadata + a fileUrl, not the file bytes
-- themselves. fileUrl is either a root-relative /downloads/... path
-- (pre-installed static assets shipped in public/), an external link
-- an admin pasted (Google Drive/Sheets), or a storage URL returned by
-- IFileStorage for an admin-uploaded file (STORY-098.5). fileKey is
-- non-null only in that last case — it's the storage key needed to
-- delete/replace the file later; this migration adds it up front
-- (not as a separate migration) since the table has not shipped to
-- any deployed environment yet.

CREATE TABLE "resources" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileKey" TEXT,
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
