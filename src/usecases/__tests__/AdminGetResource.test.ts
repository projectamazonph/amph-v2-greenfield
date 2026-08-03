import { describe, it, expect, beforeEach } from "vitest";
import { AdminGetResource } from "../AdminGetResource";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { createResource } from "@/domain/entities/Resource";

describe("AdminGetResource", () => {
  let repo: InMemoryResourceRepository;
  let useCase: AdminGetResource;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    useCase = new AdminGetResource({ resourceRepo: repo });

    const seed = createResource({
      id: "res_1",
      title: "Title",
      description: "Description",
      category: "cheat_sheet",
      fileType: "pdf",
      fileUrl: "https://example.com/a.pdf",
      accessTier: "STARTER",
    });
    if (!seed.ok) throw new Error("seed failed");
    repo.seed(seed.value);
  });

  it("returns the resource when found", async () => {
    const r = await useCase.execute("res_1");
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.title).toBe("Title");
  });

  it("returns not_found when missing", async () => {
    const r = await useCase.execute("does_not_exist");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.kind).toBe("not_found");
  });
});
