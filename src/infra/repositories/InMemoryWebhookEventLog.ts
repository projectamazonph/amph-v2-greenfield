/**
 * InMemoryWebhookEventLog — fast in-memory adapter for IWebhookEventLog.
 */

import { Result } from "@/domain/shared/Result";
import type {
  IWebhookEventLog,
  WebhookEventLogError,
  WebhookEventRecord,
  WebhookEventRecordInput,
} from "@/ports/repositories/IWebhookEventLog";

export class InMemoryWebhookEventLog implements IWebhookEventLog {
  private events: WebhookEventRecord[] = [];
  private nextId = 1;

  async record(
    input: WebhookEventRecordInput,
  ): Promise<Result<WebhookEventRecord, WebhookEventLogError>> {
    const entry: WebhookEventRecord = {
      ...input,
      id: `webhook_event_${this.nextId++}`,
      processedAt: null,
      processingError: null,
      createdAt: new Date(),
    };
    this.events.push(entry);
    return Result.ok(entry);
  }

  async markProcessed(id: string, error?: string): Promise<Result<void, WebhookEventLogError>> {
    const entry = this.events.find((e) => e.id === id);
    if (!entry) {
      return Result.err({ kind: "db_error", message: `webhook event ${id} not found` });
    }
    entry.processedAt = new Date();
    entry.processingError = error ?? null;
    return Result.ok(undefined);
  }

  /** Test helper. */
  getAll(): readonly WebhookEventRecord[] {
    return [...this.events];
  }

  /** Test helper. */
  clear(): void {
    this.events = [];
    this.nextId = 1;
  }
}
