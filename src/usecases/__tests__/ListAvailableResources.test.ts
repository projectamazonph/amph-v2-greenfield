import { describe, it, expect, beforeEach } from "vitest";
import { ListAvailableResources } from "../ListAvailableResources";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { createResource, updateResource } from "@/domain/entities/Resource";

describe("ListAvailableResources", () => {
  let repo: InMemoryResourceRepository;
  let useCase: ListAvailableResources;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    useCase = new ListAvailableResources({ resourceRepo: repo });

    const preview = createResource({
      id: "res_preview",
      title: "Free quick guide",
      description: "d",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/free.pdf",
      accessTier: "PREVIEW",
    });
    const starter = createResource({
      id: "res_starter",
      title: "Starter template",
      description: "d",
      category: "template",
      fileType: "docx",
      fileUrl: "https://example.com/starter.docx",
      accessTier: "STARTER",
    });
    const pro = createResource({
      id: "res_pro",
      title: "Pro automation tool",
      description: "d",
      category: "automation_tool",
      fileType: "gsheet",
      fileUrl: "https://example.com/pro-copy",
      accessTier: "PRO",
    });
    const unpublished = createResource({
      id: "res_draft",
      title: "Draft handout",
      description: "d",
      category: "handout",
      fileType: "pdf",
      fileUrl: "https://example.com/draft.pdf",
      accessTier: "PREVIEW",
    });
    if (!preview.ok || !starter.ok || !pro.ok || !unpublished.ok) {
      throw new Error("seed failed");
    }
    const unpublishedDraft = updateResource(unpublished.value, { isPublished: false });
    if (!unpublishedDraft.ok) throw new Error("seed failed");

    repo.seed(preview.value);
    repo.seed(starter.value);
    repo.seed(pro.value);
    repo.seed(unpublishedDraft.value);
  });

  it("excludes unpublished resources", async () => {
    const r = await useCase.execute({ subscriptionTier: "PRO" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.some((x) => x.resource.id === "res_draft")).toBe(false);
  });

  it("marks nothing as locked for a PRO subscriber", async () => {
    const r = await useCase.execute({ subscriptionTier: "PRO" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.every((x) => x.locked === false)).toBe(true);
  });

  it("locks PRO/STARTER resources for a FREE subscriber but not PREVIEW ones", async () => {
    const r = await useCase.execute({ subscriptionTier: "FREE" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = new Map(r.value.map((x) => [x.resource.id, x.locked]));
    expect(byId.get("res_preview")).toBe(false);
    expect(byId.get("res_starter")).toBe(true);
    expect(byId.get("res_pro")).toBe(true);
  });

  it("locks only PRO resources for a STARTER subscriber", async () => {
    const r = await useCase.execute({ subscriptionTier: "STARTER" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const byId = new Map(r.value.map((x) => [x.resource.id, x.locked]));
    expect(byId.get("res_preview")).toBe(false);
    expect(byId.get("res_starter")).toBe(false);
    expect(byId.get("res_pro")).toBe(true);
  });
});
