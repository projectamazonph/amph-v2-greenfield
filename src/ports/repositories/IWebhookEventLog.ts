/**
 * IWebhookEventLog — port for persisting inbound webhook payloads
 * independent of business-entity state (Order, etc.).
 *
 * Audit hardening follow-up (docs/audit-2026-07-26-hardening-review.md):
 * the PayMongo webhook route already has order-level idempotency and
 * signature verification, but a webhook that fails signature checks,
 * arrives before its order exists, or needs replaying left no durable
 * trace to debug from. This port fixes that.
 *
 * ADR-014: every port method returns Result<T, E>.
 */

import type { Result } from "@/domain/shared/Result";

export type WebhookEventLogError = { kind: "db_error"; message: string };

export interface WebhookEventRecordInput {
  provider: string;
  eventType: string;
  providerEventId?: string;
  signatureValid: boolean;
  rawPayload: string;
}

export interface WebhookEventRecord extends WebhookEventRecordInput {
  id: string;
  processedAt: Date | null;
  processingError: string | null;
  createdAt: Date;
}

export interface IWebhookEventLog {
  /** Persist the raw event as soon as it's received, before processing. */
  record(input: WebhookEventRecordInput): Promise<Result<WebhookEventRecord, WebhookEventLogError>>;

  /**
   * Mark a previously-recorded event as processed. Pass `error` when
   * processing failed (e.g. order not found, enrollment failed) so the
   * failure is visible without re-parsing logs.
   */
  markProcessed(id: string, error?: string): Promise<Result<void, WebhookEventLogError>>;
}
