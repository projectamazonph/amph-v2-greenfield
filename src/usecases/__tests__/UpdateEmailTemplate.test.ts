/**
 * UpdateEmailTemplate.test.ts — STORY-063.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { UpdateEmailTemplate } from "@/usecases/UpdateEmailTemplate";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { InMemoryIdGenerator } from "@/infra/system/InMemoryIdGenerator";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

function makeTemplate(
  type: Parameters<typeof createEmailTemplate>[0]["type"],
  overrides: Partial<Parameters<typeof createEmailTemplate>[0]> = {},
) {
  const r = createEmailTemplate({
    id: `et_${type}`,
    type,
    subject: "Original subject",
    headline: "Original headline",
    introBody: "Original body",
    ctaLabel: "Original CTA",
    updatedById: "admin_1",
    ...overrides,
  });
  if (!r.ok) throw new Error(`seed failed: ${JSON.stringify(r.error)}`);
  return r.value;
}

function makeContainer() {
  const repo = new InMemoryEmailTemplateRepository();
  const auditLog = new InMemoryAuditLog();
  const idGen = new InMemoryIdGenerator();
  const clock = new FixedClock(new Date("2026-07-24T00:00:00Z"));
  const recordAuditLog = new RecordAuditLog({ auditLog, idGen, clock });
  const useCase = new UpdateEmailTemplate({
    emailTemplateRepo: repo,
    idGen,
    clock,
    recordAuditLog,
  });
  return { repo, auditLog, useCase, idGen, clock };
}

describe("UpdateEmailTemplate", () => {
  it("updates an existing template and persists the new state", async () => {
    const { repo, useCase } = makeContainer();
    const seeded = makeTemplate("welcome");
    repo.seed(seeded);

    const r = await useCase.execute({
      type: "welcome",
      patch: { subject: "New subject" },
      actorId: "admin_2",
    });

    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.templateType).toBe("welcome");

    const reread = await repo.findByType("welcome");
    expect(reread.ok && reread.value?.subject).toBe("New subject");
    // Untouched fields are preserved
    expect(reread.ok && reread.value?.headline).toBe(seeded.headline);
  });

  it("updates the updatedById field to the calling admin", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("receipt"));

    const r = await useCase.execute({
      type: "receipt",
      patch: { subject: "X" },
      actorId: "admin_42",
    });
    expect(r.ok).toBe(true);

    const reread = await repo.findByType("receipt");
    expect(reread.ok && reread.value?.updatedById).toBe("admin_42");
  });

  it("updates the updatedAt timestamp via the injected clock", async () => {
    const { repo, useCase, clock } = makeContainer();
    repo.seed(makeTemplate("refund", { updatedAt: new Date("2026-01-01") }));

    await useCase.execute({
      type: "refund",
      patch: { subject: "X" },
      actorId: "admin_1",
    });

    const reread = await repo.findByType("refund");
    expect(reread.ok && reread.value?.updatedAt).toEqual(clock.now());
  });

  it("creates a new row when none exists (upsert semantics)", async () => {
    const { repo, useCase } = makeContainer();
    const r = await useCase.execute({
      type: "certificate",
      patch: {
        subject: "Your certificate is ready",
        headline: "Congratulations!",
        introBody: "You've earned your certificate.",
        ctaLabel: "Download Certificate",
      },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const reread = await repo.findByType("certificate");
    expect(reread.ok).toBe(true);
    if (!reread.ok) return;
    expect(reread.value).not.toBeNull();
    expect(reread.value?.subject).toBe("Your certificate is ready");
  });

  it("returns invalid_type for unknown types", async () => {
    const { useCase } = makeContainer();
    const r = await useCase.execute({
      type: "not_a_real_type",
      patch: { subject: "X" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_type");
  });

  it("rejects empty actorId", async () => {
    const { useCase } = makeContainer();
    const r = await useCase.execute({
      type: "welcome",
      patch: { subject: "X" },
      actorId: "  ",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("rejects empty patched subject on update", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("welcome"));
    const r = await useCase.execute({
      type: "welcome",
      patch: { subject: "  " },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
    if (r.error.kind === "invalid_input") {
      expect(r.error.message).toMatch(/subject/);
    }
  });

  it("rejects empty patched headline on update", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("welcome"));
    const r = await useCase.execute({
      type: "welcome",
      patch: { headline: "" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty patched introBody on update", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("welcome"));
    const r = await useCase.execute({
      type: "welcome",
      patch: { introBody: "  " },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
  });

  it("rejects empty patched ctaLabel on update", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("welcome"));
    const r = await useCase.execute({
      type: "welcome",
      patch: { ctaLabel: "" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
  });

  it("records an audit log on success", async () => {
    const { repo, useCase, auditLog } = makeContainer();
    repo.seed(makeTemplate("welcome"));

    await useCase.execute({
      type: "welcome",
      patch: { subject: "New" },
      actorId: "admin_1",
    });

    const entries = auditLog.getAll();
    expect(entries.some((e) => e.action === "email_template.updated")).toBe(true);
    const entry = entries.find((e) => e.action === "email_template.updated");
    expect(entry?.targetId).toBe("welcome");
    expect(entry?.actorId).toBe("admin_1");
    expect(entry?.targetType).toBe("email_template");
  });

  it("audit log records before/after on update", async () => {
    const { repo, useCase, auditLog } = makeContainer();
    repo.seed(makeTemplate("receipt"));

    await useCase.execute({
      type: "receipt",
      patch: { subject: "Updated subject" },
      actorId: "admin_1",
    });

    const entry = auditLog.getAll().find((e) => e.action === "email_template.updated");
    const meta = entry?.metadata as { mode?: string; before?: unknown; after?: unknown };
    expect(meta?.mode).toBe("update");
    expect((meta?.before as { subject?: string })?.subject).toBe("Original subject");
    expect((meta?.after as { subject?: string })?.subject).toBe("Updated subject");
  });

  it("audit log records create mode for first-time save", async () => {
    const { useCase, auditLog } = makeContainer();
    await useCase.execute({
      type: "live_class_reminder",
      patch: {
        subject: "Reminder",
        headline: "See you in class!",
        introBody: "Don't forget.",
        ctaLabel: "Join Class",
      },
      actorId: "admin_1",
    });

    const entry = auditLog.getAll().find((e) => e.action === "email_template.updated");
    expect(entry).toBeDefined();
    const meta = entry?.metadata as { mode?: string };
    expect(meta?.mode).toBe("create");
  });

  it("returns db_error on repo failure", async () => {
    const { repo, useCase } = makeContainer();
    repo.seed(makeTemplate("welcome"));
    repo.upsert = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });

    const r = await useCase.execute({
      type: "welcome",
      patch: { subject: "X" },
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
