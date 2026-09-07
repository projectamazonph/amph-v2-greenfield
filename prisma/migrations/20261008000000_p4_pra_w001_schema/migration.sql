-- P4 W0-01 (#403): unified schema migration for all P0/P1/P2 features.
--
-- One migration adds 18 new tables spanning payments, invoices,
-- prerequisites, assignments, oauth, settings, announcements,
-- leaderboards, dropoff telemetry, question-bank, affiliates, and the
-- skill-map. Resource (existing) and EmailTemplate (existing) are
-- intentionally NOT redefined here.
--
-- Conventions (matched to baseline 20260719000000_baseline/migration.sql):
--   - TEXT primary keys holding cuids.
--   - Money in minor units (INTEGER).
--   - JSONB for JSON columns; TEXT[] for arrays.
--   - TIMESTAMP(3) with CURRENT_TIMESTAMP for created/updated.
--   - Plain TEXT for state machines; allowed values documented in the
--     Prisma schema (status / provider / method / level / scope /
--     window / difficulty).
--   - Foreign key actions match the existing schema's per-relation
--     intent (RESTRICT for business-crucial rows like payments.invoices
--     -> orders; CASCADE for child rows that exist only because the
--     parent does, like invoice_line_items -> invoices).
--   - Actor ids (createdById/updatedById/graderId) are bare TEXT with
--     no FK — same treatment as email_templates.updatedById and the
--     2026-09-06 audit-fields migration.

-- ============================================================================
-- Payments: granular PayMongo payment event log, keyed by orderId.
-- Distinct from orders.paymongoPaymentId/paymongoStatus — those are
-- one-row-per-order summaries; this is the multi-row ledger that records
-- every webhook/update from the provider so refunds and disputes can be
-- reconciled.
-- ============================================================================

CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'paymongo',
    "providerPaymentId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "method" TEXT NOT NULL DEFAULT 'gcash',
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "rawProviderResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- providerPaymentId is the natural idempotency key from PayMongo. UNIQUE
-- here (and surfaced as a UNIQUE INDEX, not the default `@@unique`
-- block, because we also want it to be the eventual lookup target for
-- webhook reconciliation when no order exists yet).
CREATE UNIQUE INDEX "payments_providerPaymentId_key" ON "payments"("providerPaymentId");

CREATE INDEX "payments_orderId_idx" ON "payments"("orderId");
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- RESTRICT matches the existing orders.<- orders.userId RESTRICT
-- pattern: a paid order can't be deleted while invoices/payments still
-- reference it.
ALTER TABLE "payments" ADD CONSTRAINT "payments_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Invoices: BIR-compliant receipt header + line items.
-- ============================================================================

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "birTin" TEXT,
    "businessName" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "subtotalMinor" INTEGER NOT NULL,
    "taxMinor" INTEGER NOT NULL DEFAULT 0,
    "totalMinor" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "pdfUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- Natural keys: one invoice per order (regulatory: receipts are 1:1
-- with the underlying sale), and the human-readable invoice number is
-- globally unique.
CREATE UNIQUE INDEX "invoices_orderId_key" ON "invoices"("orderId");
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

CREATE INDEX "invoices_userId_idx" ON "invoices"("userId");
CREATE INDEX "invoices_orderId_idx" ON "invoices"("orderId");

-- RESTRICT on both FKs: same logic as payments above — invoices are
-- audit/regulatory records; cascade-deleting them via user/order
-- removal would be a compliance defect.
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Invoice line items: child of Invoice.
-- ============================================================================

CREATE TABLE "invoice_line_items" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceMinor" INTEGER NOT NULL,
    "totalMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "invoice_line_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "invoice_line_items_invoiceId_idx" ON "invoice_line_items"("invoiceId");

-- CASCADE: line items have no meaning without the parent invoice.
-- Matches quiz_options <- quiz_questions.
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_invoiceId_fkey"
    FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Prerequisites: course/lesson prerequisite graph.
-- A Prerequisite row states "courseId requires requiresCourseId
-- (and/or) requiresLessonId". The triple unique constraint stops the
-- same edge being inserted twice.
-- ============================================================================

CREATE TABLE "prerequisites" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "requiresCourseId" TEXT NOT NULL,
    "requiresLessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "prerequisites_pkey" PRIMARY KEY ("id")
);

-- (courseId, requiresCourseId, requiresLessonId) is the natural edge
-- identity. requiresLessonId is nullable so the DB treats NULLs as
-- distinct by default — same effect as Postgres' standard NULL
-- semantics for UNIQUE constraints.
CREATE UNIQUE INDEX "prerequisites_courseId_requiresCourseId_requiresLessonId_key"
    ON "prerequisites"("courseId", "requiresCourseId", "requiresLessonId");

CREATE INDEX "prerequisites_courseId_idx" ON "prerequisites"("courseId");
CREATE INDEX "prerequisites_requiresCourseId_idx" ON "prerequisites"("requiresCourseId");

-- RESTRICT on both course FKs: deleting a course should be a deliberate
-- operation that the admin must handle before the dependency edge
-- graph is cleared. Same treatment as orders.courseId.
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_requiresCourseId_fkey"
    FOREIGN KEY ("requiresCourseId") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prerequisites" ADD CONSTRAINT "prerequisites_requiresLessonId_fkey"
    FOREIGN KEY ("requiresLessonId") REFERENCES "lessons"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Assignments: instructor-assigned student work.
-- ============================================================================

CREATE TABLE "assignments" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "grade" INTEGER,
    "graderId" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "assignments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "assignments_courseId_idx" ON "assignments"("courseId");
CREATE INDEX "assignments_userId_idx" ON "assignments"("userId");
CREATE INDEX "assignments_status_dueAt_idx" ON "assignments"("status", "dueAt");

-- RESTRICT on courseId (audit/grade trail), CASCADE on userId (an
-- account deletion drops a student's own assignments; same pattern as
-- sessions/enrollments).
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "assignments" ADD CONSTRAINT "assignments_graderId_fkey"
    FOREIGN KEY ("graderId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- OAuth: social-login linkage.
-- ============================================================================

CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- (provider, providerUserId) is the natural identity: a single upstream
-- account should only be linked to one local user.
CREATE UNIQUE INDEX "oauth_accounts_provider_providerUserId_key"
    ON "oauth_accounts"("provider", "providerUserId");

CREATE INDEX "oauth_accounts_userId_idx" ON "oauth_accounts"("userId");

-- CASCADE: deleting a user purges their linked social accounts.
-- Same treatment as sessions / email_verifications / password_resets.
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Settings: global key/value store.
-- The `value` column is JSONB so admins can store arbitrary structured
-- configuration without schema migrations.
-- ============================================================================

CREATE TABLE "settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- key is the natural primary identifier for settings.
CREATE UNIQUE INDEX "settings_key_key" ON "settings"("key");

-- ============================================================================
-- Announcements: site-wide banners + per-user dismissal/opt-out state.
-- ============================================================================

CREATE TABLE "announcements" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "level" TEXT NOT NULL DEFAULT 'INFO',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "dismissible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- Filter banners by (isActive, startsAt, endsAt) on every page render
-- (the maintenance banner code path). Composite is faster than the
-- three per-column indexes for the same query.
CREATE INDEX "announcements_isActive_startsAt_endsAt_idx"
    ON "announcements"("isActive", "startsAt", "endsAt");

CREATE TABLE "announcement_dismissals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "dismissedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_dismissals_pkey" PRIMARY KEY ("id")
);

-- One dismissal per (user, announcement); inserting a second row would
-- defeat the dismissible semantics.
CREATE UNIQUE INDEX "announcement_dismissals_userId_announcementId_key"
    ON "announcement_dismissals"("userId", "announcementId");

CREATE INDEX "announcement_dismissals_userId_idx" ON "announcement_dismissals"("userId");

-- CASCADE from the announcement side: a removed announcement clears
-- every dismissal record tied to it. CASCADE from the user side: a
-- removed user drops their dismissals along with their account.
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "announcement_dismissals" ADD CONSTRAINT "announcement_dismissals_announcementId_fkey"
    FOREIGN KEY ("announcementId") REFERENCES "announcements"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "announcement_opt_outs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "optOutAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_opt_outs_pkey" PRIMARY KEY ("id")
);

-- One opt-out per user (it's a binary preference, not a list).
CREATE UNIQUE INDEX "announcement_opt_outs_userId_key" ON "announcement_opt_outs"("userId");

ALTER TABLE "announcement_opt_outs" ADD CONSTRAINT "announcement_opt_outs_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Leaderboards: definition + ranked entries.
-- ============================================================================

CREATE TABLE "leaderboards" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL DEFAULT 'GLOBAL',
    "courseId" TEXT,
    "window" TEXT NOT NULL DEFAULT 'ALL_TIME',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "leaderboards_pkey" PRIMARY KEY ("id")
);

-- Slug is the public-facing lookup key (URL-safe, admin-set).
CREATE UNIQUE INDEX "leaderboards_slug_key" ON "leaderboards"("slug");

-- Listing active boards by scope (GLOBAL/COURSE/COHORT) is the default
-- admin view.
CREATE INDEX "leaderboards_isActive_scope_idx" ON "leaderboards"("isActive", "scope");

-- RESTRICT on courseId: a leaderboard is a published artefact; admin
-- must remove it before the underlying course can be removed.
ALTER TABLE "leaderboards" ADD CONSTRAINT "leaderboards_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "leaderboard_entries" (
    "id" TEXT NOT NULL,
    "leaderboardId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "rank" INTEGER NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaderboard_entries_pkey" PRIMARY KEY ("id")
);

-- One row per (board, user); the recompute job does upserts on this key.
CREATE UNIQUE INDEX "leaderboard_entries_leaderboardId_userId_key"
    ON "leaderboard_entries"("leaderboardId", "userId");

-- The board-render query is `WHERE leaderboardId = ? ORDER BY rank`.
-- The composite index satisfies both the filter and the sort in one
-- pass — a single-column rank index can't because Postgres wouldn't
-- know which leaderboard's rank to walk.
CREATE INDEX "leaderboard_entries_leaderboardId_rank_idx"
    ON "leaderboard_entries"("leaderboardId", "rank");

-- CASCADE from the leaderboard: the board is the source of truth;
-- removing it drops every entry. NO FK on userId (no FK declared in
-- Prisma schema) — entries persist even if a user is deleted, since
-- they hold a snapshot score at computedAt.
ALTER TABLE "leaderboard_entries" ADD CONSTRAINT "leaderboard_entries_leaderboardId_fkey"
    FOREIGN KEY ("leaderboardId") REFERENCES "leaderboards"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Dropoff telemetry: append-only event log.
-- All FK columns are nullable to capture anonymous (no-user) and
-- cross-context (no-course/lesson) events without losing the row.
-- ============================================================================

CREATE TABLE "dropoff_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "courseId" TEXT,
    "lessonId" TEXT,
    "eventType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dropoff_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "dropoff_events_userId_idx" ON "dropoff_events"("userId");
CREATE INDEX "dropoff_events_courseId_idx" ON "dropoff_events"("courseId");
CREATE INDEX "dropoff_events_lessonId_idx" ON "dropoff_events"("lessonId");
CREATE INDEX "dropoff_events_occurredAt_idx" ON "dropoff_events"("occurredAt");

-- SET NULL on all FKs: telemetry rows outlive the user/course/lesson
-- they reference. The nullable columns stay populated for known events.
ALTER TABLE "dropoff_events" ADD CONSTRAINT "dropoff_events_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dropoff_events" ADD CONSTRAINT "dropoff_events_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "dropoff_events" ADD CONSTRAINT "dropoff_events_lessonId_fkey"
    FOREIGN KEY ("lessonId") REFERENCES "lessons"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Question bank items: reusable quiz items, decoupled from any Quiz.
-- ============================================================================

CREATE TABLE "question_bank_items" (
    "id" TEXT NOT NULL,
    "courseId" TEXT,
    "topic" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL DEFAULT 'BEGINNER',
    "questionText" TEXT NOT NULL,
    "explanation" TEXT NOT NULL DEFAULT '',
    "options" JSONB NOT NULL,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "question_bank_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "question_bank_items_courseId_idx" ON "question_bank_items"("courseId");
CREATE INDEX "question_bank_items_topic_idx" ON "question_bank_items"("topic");
CREATE INDEX "question_bank_items_difficulty_idx" ON "question_bank_items"("difficulty");

-- RESTRICT on courseId: a question linked to a course must be removed
-- or moved before the course can be deleted (audit trail).
ALTER TABLE "question_bank_items" ADD CONSTRAINT "question_bank_items_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "courses"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Affiliates: partner accounts + per-referral attribution.
-- ============================================================================

CREATE TABLE "affiliate_partners" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "commissionPercent" INTEGER NOT NULL DEFAULT 10,
    "payoutEmail" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "affiliate_partners_pkey" PRIMARY KEY ("id")
);

-- One partner account per user; slug is the public-facing URL token.
CREATE UNIQUE INDEX "affiliate_partners_userId_key" ON "affiliate_partners"("userId");
CREATE UNIQUE INDEX "affiliate_partners_slug_key" ON "affiliate_partners"("slug");

-- RESTRICT on userId: affiliates are financial actors, account deletion
-- must be deliberate. (CASCADE would silently drop payout history on
-- the partner's user record.)
ALTER TABLE "affiliate_partners" ADD CONSTRAINT "affiliate_partners_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "affiliate_referrals" (
    "id" TEXT NOT NULL,
    "affiliatePartnerId" TEXT NOT NULL,
    "refereeUserId" TEXT NOT NULL,
    "orderId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "commissionMinor" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'PHP',
    "convertedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "affiliate_referrals_pkey" PRIMARY KEY ("id")
);

-- (affiliatePartnerId, refereeUserId) is the natural identity: a referee
-- can only have one open referral per partner.
CREATE UNIQUE INDEX "affiliate_referrals_affiliatePartnerId_refereeUserId_key"
    ON "affiliate_referrals"("affiliatePartnerId", "refereeUserId");

CREATE INDEX "affiliate_referrals_refereeUserId_idx" ON "affiliate_referrals"("refereeUserId");
CREATE INDEX "affiliate_referrals_orderId_idx" ON "affiliate_referrals"("orderId");

-- CASCADE from affiliatePartner (referrals don't outlive the partner),
-- RESTRICT on orderId (audit trail — remove a referral before you can
-- delete the order it's attributed to).
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_affiliatePartnerId_fkey"
    FOREIGN KEY ("affiliatePartnerId") REFERENCES "affiliate_partners"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "orders"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Skill map: skill definitions + per-user mastery.
-- ============================================================================

CREATE TABLE "skill_maps" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdById" TEXT,
    "updatedById" TEXT,

    CONSTRAINT "skill_maps_pkey" PRIMARY KEY ("id")
);

-- Slug is the public skill identifier.
CREATE UNIQUE INDEX "skill_maps_slug_key" ON "skill_maps"("slug");

CREATE TABLE "skill_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillMapId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "lastAssessedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skill_progress_pkey" PRIMARY KEY ("id")
);

-- One mastery row per (user, skill). CASCADE on skillMapId matches the
-- parent's lifecycle (deleting a skill removes every mastery entry).
-- userId is intentionally NOT an FK — see the schema comment: we keep
-- the historical row even after a user account deletion.
CREATE UNIQUE INDEX "skill_progress_userId_skillMapId_key"
    ON "skill_progress"("userId", "skillMapId");

CREATE INDEX "skill_progress_userId_idx" ON "skill_progress"("userId");

ALTER TABLE "skill_progress" ADD CONSTRAINT "skill_progress_skillMapId_fkey"
    FOREIGN KEY ("skillMapId") REFERENCES "skill_maps"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
