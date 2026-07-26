/**
 * PrismaWebhookEventLog — production Prisma adapter for IWebhookEventLog.
 */

import { PrismaClient } from "@prisma/client";
import { Result } from "@/domain/shared/Result";
import type {
  IWebhookEventLog,
  WebhookEventLogError,
  WebhookEventRecord,
  WebhookEventRecordInput,
} from "@/ports/repositories/IWebhookEventLog";

export class PrismaWebhookEventLog implements IWebhookEventLog {
  constructor(private readonly db: PrismaClient) {}

  async record(
    input: WebhookEventRecordInput,
  ): Promise<Result<WebhookEventRecord, WebhookEventLogError>> {
    try {
      const row = await this.db.webhookEvent.create({
        data: {
          provider: input.provider,
          eventType: input.eventType,
          providerEventId: input.providerEventId ?? null,
          signatureValid: input.signatureValid,
          rawPayload: input.rawPayload,
        },
      });
      return Result.ok({
        id: row.id,
        provider: row.provider,
        eventType: row.eventType,
        providerEventId: row.providerEventId ?? undefined,
        signatureValid: row.signatureValid,
        rawPayload: row.rawPayload,
        processedAt: row.processedAt,
        processingError: row.processingError,
        createdAt: row.createdAt,
      });
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }

  async markProcessed(id: string, error?: string): Promise<Result<void, WebhookEventLogError>> {
    try {
      await this.db.webhookEvent.update({
        where: { id },
        data: {
          processedAt: new Date(),
          processingError: error ?? null,
        },
      });
      return Result.ok(undefined);
    } catch (err: unknown) {
      return Result.err({ kind: "db_error", message: String(err) });
    }
  }
}
