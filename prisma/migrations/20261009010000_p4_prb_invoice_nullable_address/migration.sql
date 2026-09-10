-- P0-02 (P4 PR-B) -- relax the Invoice buyer-address snapshot.
--
-- Buyer-address capture is a follow-up profile story. Webhook-issued
-- invoices carry a null snapshot and are keyed by userId/orderId, so
-- the address columns must accept NULL. Existing rows are untouched:
-- issued invoices keep whatever snapshot they already carry.
-- No backfill: NULL already means "not on file".

ALTER TABLE "invoices" ALTER COLUMN "addressLine1" DROP NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "city" DROP NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "province" DROP NOT NULL;
ALTER TABLE "invoices" ALTER COLUMN "postalCode" DROP NOT NULL;
