import { describe, it, expect, beforeEach } from "vitest";
import { UpdateEmailTemplate } from "../UpdateEmailTemplate";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { InMemoryAuditLog } from "@/infra/repositories/InMemoryAuditLog";
import { RecordAuditLog } from "@/usecases/RecordAuditLog";
import { FixedClock } from "@/ports/system/Clock";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

function makeRecordAuditLog(audit: InMemoryAuditLog) {
  return new RecordAuditLog({
    auditLog: audit,
    idGen: { newId: () => "audit_1", paymentRef: () => "x", receiptNumber: () => "x" },
    clock: new FixedClock(new Date("2025-01-01T00:00:00Z")),
  });
}

describe("UpdateEmailTemplate", () => {
  let repo: InMemoryEmailTemplateRepository;
  let audit: InMemoryAuditLog;
  let useCase: UpdateEmailTemplate;

  beforeEach(() => {
    repo = new InMemoryEmailTemplateRepository();
    audit = new InMemoryAuditLog();
    useCase = new UpdateEmailTemplate({
      emailTemplateRepo: repo,
      recordAuditLog: makeRecordAuditLog(audit),
      idGen: { newId: () => "et_new", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
    });
  });

  it("returns invalid_type for an unknown type string", async () => {
    const r = await useCase.execute({
      type: "not_a_real_type",
      subject: "s",
      headline: "h",
      introBody: "i",
      ctaLabel: "c",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_type");
  });

  it("creates a new row when none exists yet for the type", async () => {
    const r = await useCase.execute({
      type: "welcome",
      subject: "Welcome!",
      headline: "Welcome to AMPH",
      introBody: "Let's get started.",
      ctaLabel: "Go to dashboard",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.template.id).toBe("et_new");
    expect(r.value.template.headline).toBe("Welcome to AMPH");

    const stored = await repo.findByType("welcome");
    expect(stored.ok && stored.value?.headline).toBe("Welcome to AMPH");
  });

  it("patches an existing row, preserving its id and type", async () => {
    const created = createEmailTemplate({
      id: "et_existing",
      type: "receipt",
      subject: "Your receipt",
      headline: "Old headline",
      introBody: "Old intro",
      ctaLabel: "View order",
      updatedById: "admin_0",
    });
    if (!created.ok) throw new Error("seed failed");
    repo.seed(created.value);

    const r = await useCase.execute({
      type: "receipt",
      subject: "Your receipt",
      headline: "New headline",
      introBody: "Old intro",
      ctaLabel: "View order",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.template.id).toBe("et_existing");
    expect(r.value.template.headline).toBe("New headline");
    expect(r.value.template.updatedById).toBe("admin_1");
  });

  it("rejects an empty headline", async () => {
    const r = await useCase.execute({
      type: "welcome",
      subject: "s",
      headline: "   ",
      introBody: "i",
      ctaLabel: "c",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_input");
  });

  it("writes an audit log entry on success", async () => {
    await useCase.execute({
      type: "welcome",
      subject: "s",
      headline: "h",
      introBody: "i",
      ctaLabel: "c",
      actorId: "admin_1",
    });
    const logs = await audit.getAll();
    expect(
      logs.some((l) => l.action === "email_template.updated" && l.targetId === "welcome"),
    ).toBe(true);
  });

  it("returns db_error on repository upsert failure", async () => {
    const badRepo = new InMemoryEmailTemplateRepository();
    badRepo.upsert = async () => ({ ok: false, error: { kind: "db_error", message: "db down" } });
    const audit2 = new InMemoryAuditLog();
    const uc = new UpdateEmailTemplate({
      emailTemplateRepo: badRepo,
      recordAuditLog: makeRecordAuditLog(audit2),
      idGen: { newId: () => "et_new", paymentRef: () => "x", receiptNumber: () => "x" },
      clock: new FixedClock(new Date("2026-01-01T00:00:00Z")),
    });
    const r = await uc.execute({
      type: "welcome",
      subject: "s",
      headline: "h",
      introBody: "i",
      ctaLabel: "c",
      actorId: "admin_1",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
