-- STORY-163: per-student, per-lesson worksheet artifact.
--
-- One row per (studentId, lessonSlug); 34 nullable string columns (11 + 7 +
-- 6 + 5 + 5) carry the Profitability and Max-CPC Sheet fields across Module 1.
-- Soft-delete via deletedAt per AGENTS.md "Every mutable Prisma model needs
-- deletedAt". Composite uniqueness on (studentId, lessonSlug) makes the
-- application-level upsert deterministic and lets the database enforce the
-- constraint. FK to users is CASCADE to match the LearnerArtefact pattern
-- (deleting a user purges their worksheets).

CREATE TABLE "worksheet_entries" (
  "id" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "lessonSlug" TEXT NOT NULL,

  -- Part 1 (Lesson 1.1) — 11 columns
  "productName" TEXT,
  "price" TEXT,
  "campaignObjective" TEXT,
  "weeklyImpressions" TEXT,
  "weeklyClicks" TEXT,
  "weeklyAdSpend" TEXT,
  "weeklyOrders" TEXT,
  "weeklyAdSales" TEXT,
  "weeklyTotalSales" TEXT,
  "dataWindow" TEXT,
  "firstQuestionToInvestigate" TEXT,

  -- Part 2 (Lesson 1.2) — 7 columns
  "productCvr" TEXT,
  "targetAcos" TEXT,
  "maxCpc" TEXT,
  "actualCpc" TEXT,
  "aboveOrBelowMax" TEXT,
  "weeklyCtr" TEXT,
  "firstCheckIfAboveMax" TEXT,

  -- Part 3 (Lesson 1.3) — 6 columns
  "totalCostToSell" TEXT,
  "profitMarginBeforeAds" TEXT,
  "breakEvenAcos" TEXT,
  "weeklyActualAcos" TEXT,
  "profitOrLossPerAdSale" TEXT,
  "weeklyTacos" TEXT,

  -- Part 4 (Lesson 1.4) — 5 columns
  "productProfitMargin" TEXT,
  "minimumRoas" TEXT,
  "targetRoasWithCushion" TEXT,
  "weeklyActualRoas" TEXT,
  "aboveOrBelowMinimum" TEXT,

  -- Part 5 (Lesson 1.5) — 5 columns
  "weeklyPattern" TEXT,
  "bottleneckMetric" TEXT,
  "rootCauseToCheckFirst" TEXT,
  "oneActionThisWeek" TEXT,
  "nextReviewDate" TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "deletedAt" TIMESTAMP(3),
  "createdById" TEXT,
  "updatedById" TEXT,

  CONSTRAINT "worksheet_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "worksheet_entries_studentId_lessonSlug_key"
  ON "worksheet_entries"("studentId", "lessonSlug");

CREATE INDEX "worksheet_entries_studentId_idx"
  ON "worksheet_entries"("studentId");

ALTER TABLE "worksheet_entries"
  ADD CONSTRAINT "worksheet_entries_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "users"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;