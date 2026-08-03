import { describe, it, expect, beforeEach } from "vitest";
import { AdminListResources } from "../AdminListResources";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { createResource, updateResource } from "@/domain/entities/Resource";

describe("AdminListResources", () => {
  let repo: InMemoryResourceRepository;
  let useCase: AdminListResources;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    useCase = new AdminListResources({ resourceRepo: repo });
  });

  it("returns both published and unpublished resources", async () => {
    const published = createResource({
      id: "res_pub",
      title: "Published",
      description: "d",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/a.pdf",
      accessTier: "PREVIEW",
    });
    const draft = createResource({
      id: "res_draft",
      title: "Draft",
      description: "d",
      category: "guide",
      fileType: "pdf",
      fileUrl: "https://example.com/b.pdf",
      accessTier: "PREVIEW",
    });
    if (!published.ok || !draft.ok) throw new Error("seed failed");
    const unpublishedDraft = updateResource(draft.value, { isPublished: false });
    if (!unpublishedDraft.ok) throw new Error("seed failed");

    repo.seed(published.value);
    repo.seed(unpublishedDraft.value);

    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.map((res) => res.id).sort()).toEqual(["res_draft", "res_pub"]);
  });

  it("returns an empty list when there are no resources", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value).toEqual([]);
  });
});
