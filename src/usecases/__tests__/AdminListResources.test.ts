/**
 * AdminListResources.test.ts — STORY-098, search/filter/pagination
 * added in review (mirrors ListUsers.test.ts's coverage shape:
 * no filters, per-filter, search, pagination, combinations, empty
 * results, page beyond last).
 */
import { describe, it, expect, beforeEach } from "vitest";
import { AdminListResources } from "../AdminListResources";
import { InMemoryResourceRepository } from "@/infra/repositories/InMemoryResourceRepository";
import { createResource, updateResource, type Resource } from "@/domain/entities/Resource";

async function seedResources(repo: InMemoryResourceRepository, count: number): Promise<Resource[]> {
  const out: Resource[] = [];
  for (let i = 0; i < count; i++) {
    const created = createResource({
      id: `res_${i.toString().padStart(3, "0")}`,
      title: i % 2 === 0 ? `Alpha Guide ${i}` : `Beta Template ${i}`,
      description: "d",
      category: i % 3 === 0 ? "guide" : i % 3 === 1 ? "template" : "handout",
      fileType: "pdf",
      fileUrl: `https://example.com/${i}.pdf`,
      accessTier: i % 2 === 0 ? "PRO" : "PREVIEW",
    });
    if (!created.ok) throw new Error("seed failed");
    repo.seed(created.value);
    out.push(created.value);
  }
  return out;
}

describe("AdminListResources", () => {
  let repo: InMemoryResourceRepository;
  let useCase: AdminListResources;

  beforeEach(() => {
    repo = new InMemoryResourceRepository();
    useCase = new AdminListResources({ resourceRepo: repo });
  });

  it("returns both published and unpublished resources when no filters are provided", async () => {
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
    expect(r.value.resources.map((res) => res.id).sort()).toEqual(["res_draft", "res_pub"]);
    expect(r.value.totalCount).toBe(2);
    expect(r.value.page).toBe(1);
    expect(r.value.pageSize).toBe(25);
  });

  it("returns an empty list with totalCount=0 when there are no resources", async () => {
    const r = await useCase.execute();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources).toEqual([]);
    expect(r.value.totalCount).toBe(0);
  });

  it("filters by category", async () => {
    await seedResources(repo, 9);
    const r = await useCase.execute({ category: "guide" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources.every((res) => res.category === "guide")).toBe(true);
    expect(r.value.totalCount).toBe(3);
  });

  it("filters by accessTier", async () => {
    await seedResources(repo, 9);
    const r = await useCase.execute({ accessTier: "PRO" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources.every((res) => res.accessTier === "PRO")).toBe(true);
  });

  it("filters by search across title and description", async () => {
    await seedResources(repo, 9);
    const r = await useCase.execute({ search: "alpha" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources.every((res) => res.title.toLowerCase().includes("alpha"))).toBe(true);
    expect(r.value.resources.length).toBeGreaterThan(0);
  });

  it("combines category and search filters", async () => {
    await seedResources(repo, 9);
    const r = await useCase.execute({ category: "guide", search: "alpha" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(
      r.value.resources.every((res) => res.category === "guide" && /alpha/i.test(res.title)),
    ).toBe(true);
  });

  it("returns no results for a search term that matches nothing", async () => {
    await seedResources(repo, 9);
    const r = await useCase.execute({ search: "zzz-no-match" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources).toEqual([]);
    expect(r.value.totalCount).toBe(0);
  });

  it("paginates results", async () => {
    await seedResources(repo, 30);
    const page1 = await useCase.execute({ page: 1, pageSize: 10 });
    expect(page1.ok).toBe(true);
    if (!page1.ok) return;
    expect(page1.value.resources.length).toBe(10);
    expect(page1.value.totalCount).toBe(30);

    const page2 = await useCase.execute({ page: 2, pageSize: 10 });
    expect(page2.ok).toBe(true);
    if (!page2.ok) return;
    expect(page2.value.resources.length).toBe(10);
    expect(page2.value.resources.map((r) => r.id)).not.toEqual(
      page1.value.resources.map((r) => r.id),
    );
  });

  it("returns an empty page when requesting a page beyond the last", async () => {
    await seedResources(repo, 5);
    const r = await useCase.execute({ page: 99, pageSize: 10 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.resources).toEqual([]);
    expect(r.value.totalCount).toBe(5);
  });

  it("clamps invalid page/pageSize to the defaults", async () => {
    await seedResources(repo, 5);
    const r = await useCase.execute({ page: 0, pageSize: -1 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.page).toBe(1);
    expect(r.value.pageSize).toBe(25);
  });

  it("caps pageSize at 100", async () => {
    await seedResources(repo, 5);
    const r = await useCase.execute({ pageSize: 500 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.pageSize).toBe(100);
  });
});
