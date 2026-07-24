/**
 * GetEmailTemplate.test.ts — STORY-063.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { GetEmailTemplate } from "@/usecases/GetEmailTemplate";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

function makeTemplate(
  type: Parameters<typeof createEmailTemplate>[0]["type"],
  overrides: Partial<Parameters<typeof createEmailTemplate>[0]> = {},
) {
  const r = createEmailTemplate({
    id: `et_${type}`,
    type,
    subject: "Subject",
    headline: "Headline",
    introBody: "Body",
    ctaLabel: "CTA",
    updatedById: "admin_1",
    ...overrides,
  });
  if (!r.ok) throw new Error(`seed failed: ${JSON.stringify(r.error)}`);
  return r.value;
}

describe("GetEmailTemplate", () => {
  let repo: InMemoryEmailTemplateRepository;
  let useCase: GetEmailTemplate;

  beforeEach(() => {
    repo = new InMemoryEmailTemplateRepository();
    useCase = new GetEmailTemplate({ emailTemplateRepo: repo });
  });

  it("returns the template when found", async () => {
    const tpl = makeTemplate("email_verification");
    repo.seed(tpl);

    const r = await useCase.execute("email_verification");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.template.type).toBe("email_verification");
    expect(r.value.template.subject).toBe("Subject");
  });

  it("returns not_found when the type doesn't exist", async () => {
    const r = await useCase.execute("welcome");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns not_found for an unknown type (no row exists)", async () => {
    const r = await useCase.execute("definitely_not_a_real_type");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryEmailTemplateRepository();
    badRepo.findByType = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new GetEmailTemplate({ emailTemplateRepo: badRepo });
    const r = await uc.execute("welcome");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
