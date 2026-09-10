-- P0-01 (P4 PR-B) -- card-installment plan columns on orders.
--
-- Nullable pair: NULL means pay in full. Tenure and floor are
-- validated in domain (InstallmentPlan: 3/6/12 months, PHP 3,000
-- floor); the columns only persist the chosen plan. No backfill:
-- every pre-existing order paid in full, which is exactly what
-- NULL already means.

ALTER TABLE "orders" ADD COLUMN "installmentMonths" INTEGER;
ALTER TABLE "orders" ADD COLUMN "installmentMonthlyMinor" INTEGER;
