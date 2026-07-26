-- Audit hardening: persistent webhook event log.
--
-- Persists every inbound webhook payload independent of business-entity
-- state (Order, etc.), so a webhook that fails signature verification,
-- arrives before its order exists, or needs replaying leaves a durable
-- trace. rawPayload is TEXT (not JSONB) so an unparseable body still
-- persists instead of being rejected by the column type.

CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "providerEventId" TEXT,
    "signatureValid" BOOLEAN NOT NULL,
    "rawPayload" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "processingError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "webhook_events_provider_eventType_idx" ON "webhook_events"("provider", "eventType");

CREATE INDEX "webhook_events_providerEventId_idx" ON "webhook_events"("providerEventId");

CREATE INDEX "webhook_events_createdAt_idx" ON "webhook_events"("createdAt");
