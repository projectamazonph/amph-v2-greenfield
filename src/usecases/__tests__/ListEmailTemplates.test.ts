/**
 * ListEmailTemplates.test.ts — STORY-063.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { ListEmailTemplates } from "@/usecases/ListEmailTemplates";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

function makeTemplate(type: Parameters<typeof createEmailTemplate>[0]["type"], idSuffix: string) {
  const r = createEmailTemplate({
    id: `et_${idSuffix}`,
    type,
    subject: `Subject for ${type}`,
    headline: `Headline for ${type}`,
    introBody: `Intro body for ${type}`,
    ctaLabel: `CTA for ${type}`,
    updatedById: "admin_1",
  });
  if (!r.ok) throw new Error(`seed failed: ${JSON.stringify(r.error)}`);
  return r.value;
}

describe("ListEmailTemplates", () => {
  let repo: InMemoryEmailTemplateRepository;
  let useCase: ListEmailTemplates;

  beforeEach(() => {
    repo = new InMemoryEmailTemplateRepository();
    useCase = new ListEmailTemplates({ emailTemplateRepo: repo });
  });

  it("returns an empty list when no templates exist", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual({ templates: [] });
  });

  it("returns every seeded template", async () => {
    repo.seed(makeTemplate("email_verification", "1"));
    repo.seed(makeTemplate("welcome", "2"));
    repo.seed(makeTemplate("receipt", "3"));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.templates).toHaveLength(3);
    const types = r.value.templates.map((t) => t.type);
    expect(types).toContain("email_verification");
    expect(types).toContain("welcome");
    expect(types).toContain("receipt");
  });

  it("returns templates ordered by type ascending", async () => {
    repo.seed(makeTemplate("welcome", "w"));
    repo.seed(makeTemplate("email_verification", "e"));
    repo.seed(makeTemplate("receipt", "r"));

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const types = r.value.templates.map((t) => t.type);
    expect(types).toEqual([...types].sort());
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryEmailTemplateRepository();
    badRepo.listAll = async () => ({
      ok: false,
      error: { kind: "db_error", message: "boom" },
    });
    const uc = new ListEmailTemplates({ emailTemplateRepo: badRepo });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
