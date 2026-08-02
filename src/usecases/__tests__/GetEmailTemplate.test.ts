import { describe, it, expect, beforeEach } from "vitest";
import { GetEmailTemplate } from "../GetEmailTemplate";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

describe("GetEmailTemplate", () => {
  let repo: InMemoryEmailTemplateRepository;
  let useCase: GetEmailTemplate;

  beforeEach(() => {
    repo = new InMemoryEmailTemplateRepository();
    useCase = new GetEmailTemplate({ emailTemplateRepo: repo });
  });

  it("returns invalid_type for an unknown type string", async () => {
    const r = await useCase.execute({ type: "not_a_real_type" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("invalid_type");
  });

  it("returns template: null for a known type with no customization yet", async () => {
    const r = await useCase.execute({ type: "welcome" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.type).toBe("welcome");
    expect(r.value.template).toBeNull();
  });

  it("returns the customized row when one exists", async () => {
    const created = createEmailTemplate({
      id: "et_1",
      type: "receipt",
      subject: "Your receipt",
      headline: "Thanks for your purchase",
      introBody: "Here is your receipt.",
      ctaLabel: "View order",
      updatedById: "admin_1",
    });
    if (!created.ok) throw new Error("seed failed");
    repo.seed(created.value);

    const r = await useCase.execute({ type: "receipt" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.template?.headline).toBe("Thanks for your purchase");
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryEmailTemplateRepository();
    badRepo.findByType = async () => ({
      ok: false,
      error: { kind: "db_error", message: "db down" },
    });
    const uc = new GetEmailTemplate({ emailTemplateRepo: badRepo });
    const r = await uc.execute({ type: "welcome" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
