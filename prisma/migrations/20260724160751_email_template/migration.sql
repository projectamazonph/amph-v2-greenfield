-- STORY-063: Admin email templates editor.
--
-- Persists admin-editable transactional email templates. There is at
-- most one row per `type` discriminator (the 7 known
-- EmailTemplateType values: email_verification, password_reset,
-- welcome, receipt, refund, certificate, live_class_reminder).
--
-- `id` is a stable per-row id (used by the audit log targetId); the
-- repository uses `type` as the natural unique key on the DB side
-- via `upsert`. The `updatedById` column records the admin user id
-- who last saved the template.

CREATE TABLE "email_templates" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "introBody" TEXT NOT NULL,
    "ctaLabel" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT NOT NULL,

    CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id")
);

-- One row per template type (email_verification, password_reset, …)
CREATE UNIQUE INDEX "email_templates_type_key" ON "email_templates"("type");
