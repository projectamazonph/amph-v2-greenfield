import { describe, it, expect, beforeEach } from "vitest";
import { ListEmailTemplates } from "../ListEmailTemplates";
import { InMemoryEmailTemplateRepository } from "@/infra/repositories/InMemoryEmailTemplateRepository";
import { createEmailTemplate } from "@/domain/entities/EmailTemplate";

function makeTemplate() {
  const r = createEmailTemplate({
    id: "et_1",
    type: "welcome",
    subject: "Welcome!",
    headline: "Welcome to AMPH",
    introBody: "Let's get started.",
    ctaLabel: "Go to dashboard",
    updatedById: "admin_1",
  });
  if (!r.ok) throw new Error("seed failed");
  return r.value;
}

describe("ListEmailTemplates", () => {
  let repo: InMemoryEmailTemplateRepository;
  let useCase: ListEmailTemplates;

  beforeEach(() => {
    repo = new InMemoryEmailTemplateRepository();
    useCase = new ListEmailTemplates({ emailTemplateRepo: repo });
  });

  it("returns all 7 known types even when none are customized", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.rows).toHaveLength(7);
    expect(r.value.rows.every((row) => row.template === null)).toBe(true);
  });

  it("pairs a customized type with its row and leaves the rest null", async () => {
    repo.seed(makeTemplate());
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const welcomeRow = r.value.rows.find((row) => row.type === "welcome");
    expect(welcomeRow?.template?.headline).toBe("Welcome to AMPH");
    const others = r.value.rows.filter((row) => row.type !== "welcome");
    expect(others.every((row) => row.template === null)).toBe(true);
  });

  it("returns db_error on repository failure", async () => {
    const badRepo = new InMemoryEmailTemplateRepository();
    badRepo.listAll = async () => ({ ok: false, error: { kind: "db_error", message: "db down" } });
    const uc = new ListEmailTemplates({ emailTemplateRepo: badRepo });
    const r = await uc.execute();
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("db_error");
  });
});
