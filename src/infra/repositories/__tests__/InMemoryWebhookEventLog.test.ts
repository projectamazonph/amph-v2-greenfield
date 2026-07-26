/**
 * InMemoryWebhookEventLog.test.ts — audit hardening follow-up.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { InMemoryWebhookEventLog } from "@/infra/repositories/InMemoryWebhookEventLog";

describe("InMemoryWebhookEventLog", () => {
  let log: InMemoryWebhookEventLog;

  beforeEach(() => {
    log = new InMemoryWebhookEventLog();
  });

  it("records an event and returns it with a generated id, null processedAt/processingError", async () => {
    const result = await log.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      providerEventId: "cs_abc",
      signatureValid: true,
      rawPayload: '{"type":"checkout_session.completed"}',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.id).toBeTruthy();
    expect(result.value.provider).toBe("paymongo");
    expect(result.value.processedAt).toBeNull();
    expect(result.value.processingError).toBeNull();
    expect(log.getAll()).toHaveLength(1);
  });

  it("records an event even when signature verification failed", async () => {
    const result = await log.record({
      provider: "paymongo",
      eventType: "unknown",
      signatureValid: false,
      rawPayload: "not valid json",
    });
    expect(result.ok).toBe(true);
    expect(log.getAll()[0]?.signatureValid).toBe(false);
  });

  it("marks an event processed with no error on success", async () => {
    const recorded = await log.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      signatureValid: true,
      rawPayload: "{}",
    });
    if (!recorded.ok) throw new Error("record failed");

    const result = await log.markProcessed(recorded.value.id);
    expect(result.ok).toBe(true);

    const entry = log.getAll()[0];
    expect(entry?.processedAt).toBeInstanceOf(Date);
    expect(entry?.processingError).toBeNull();
  });

  it("marks an event processed with an error string on failure", async () => {
    const recorded = await log.record({
      provider: "paymongo",
      eventType: "checkout_session.completed",
      signatureValid: true,
      rawPayload: "{}",
    });
    if (!recorded.ok) throw new Error("record failed");

    await log.markProcessed(recorded.value.id, "order_not_found");

    const entry = log.getAll()[0];
    expect(entry?.processingError).toBe("order_not_found");
  });

  it("returns db_error when marking a nonexistent id as processed", async () => {
    const result = await log.markProcessed("does-not-exist");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("db_error");
  });

  it("clear() empties the log", async () => {
    await log.record({
      provider: "paymongo",
      eventType: "x",
      signatureValid: true,
      rawPayload: "{}",
    });
    log.clear();
    expect(log.getAll()).toHaveLength(0);
  });
});
