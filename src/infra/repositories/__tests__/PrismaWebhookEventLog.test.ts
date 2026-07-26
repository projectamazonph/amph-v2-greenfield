/**
 * PrismaWebhookEventLog.test.ts — audit hardening follow-up.
 *
 * Hand-rolled in-memory PrismaClient fake, following the pattern
 * established by PrismaAuditLog.test.ts.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { PrismaWebhookEventLog } from "@/infra/repositories/PrismaWebhookEventLog";

interface WebhookEventRow {
  id: string;
  provider: string;
  eventType: string;
  providerEventId: string | null;
  signatureValid: boolean;
  rawPayload: string;
  processedAt: Date | null;
  processingError: string | null;
  createdAt: Date;
}

class FakePrismaClient {
  rows: WebhookEventRow[] = [];
  failNextCreate = false;
  failNextUpdate = false;
  private nextId = 1;

  webhookEvent = {
    create: async (args: {
      data: Omit<WebhookEventRow, "id" | "processedAt" | "processingError" | "createdAt">;
    }) => {
      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error("forced create error");
      }
      const row: WebhookEventRow = {
        id: `whe_${this.nextId++}`,
        ...args.data,
        processedAt: null,
        processingError: null,
        createdAt: new Date("2026-07-26T00:00:00Z"),
      };
      this.rows.push(row);
      return row;
    },
    update: async (args: {
      where: { id: string };
      data: { processedAt: Date; processingError: string | null };
    }) => {
      if (this.failNextUpdate) {
        this.failNextUpdate = false;
        throw new Error("forced update error");
      }
      const row = this.rows.find((r) => r.id === args.where.id);
      if (!row) throw new Error("row not found");
      row.processedAt = args.data.processedAt;
      row.processingError = args.data.processingError;
      return row;
    },
  };
}

describe("PrismaWebhookEventLog", () => {
  let db: FakePrismaClient;
  let repo: PrismaWebhookEventLog;

  beforeEach(() => {
    db = new FakePrismaClient();
    repo = new PrismaWebhookEventLog(db as never);
  });

  it("persists an event with every field mapped to the webhook_events table shape", async () => {
    const result = await repo.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      providerEventId: "cs_abc",
      signatureValid: true,
      rawPayload: '{"type":"checkout_session.completed"}',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.provider).toBe("paymongo");
    expect(result.value.eventType).toBe("checkout_session.completed");
    expect(result.value.providerEventId).toBe("cs_abc");
    expect(result.value.signatureValid).toBe(true);
    expect(result.value.processedAt).toBeNull();
    expect(db.rows).toHaveLength(1);
  });

  it("stores null providerEventId when not given", async () => {
    const result = await repo.record({
      provider: "paymongo",
      eventType: "unknown",
      signatureValid: false,
      rawPayload: "not json",
    });
    expect(result.ok).toBe(true);
    expect(db.rows[0]?.providerEventId).toBeNull();
  });

  it("returns db_error when create throws", async () => {
    db.failNextCreate = true;
    const result = await repo.record({
      provider: "paymongo",
      eventType: "x",
      signatureValid: true,
      rawPayload: "{}",
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("marks an event processed with an error string", async () => {
    const recorded = await repo.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      signatureValid: true,
      rawPayload: "{}",
    });
    if (!recorded.ok) throw new Error("record failed");

    const result = await repo.markProcessed(recorded.value.id, "order_not_found");
    expect(result.ok).toBe(true);
    expect(db.rows[0]?.processingError).toBe("order_not_found");
    expect(db.rows[0]?.processedAt).toBeInstanceOf(Date);
  });

  it("marks an event processed with null error on success", async () => {
    const recorded = await repo.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      signatureValid: true,
      rawPayload: "{}",
    });
    if (!recorded.ok) throw new Error("record failed");

    await repo.markProcessed(recorded.value.id);
    expect(db.rows[0]?.processingError).toBeNull();
  });

  it("returns db_error when update throws", async () => {
    const recorded = await repo.record({
      provider: "paymongo",
      eventType: "x",
      signatureValid: true,
      rawPayload: "{}",
    });
    if (!recorded.ok) throw new Error("record failed");

    db.failNextUpdate = true;
    const result = await repo.markProcessed(recorded.value.id);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });
});
