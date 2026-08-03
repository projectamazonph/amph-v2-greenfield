import { describe, it, expect } from "vitest";
import {
  createResource,
  updateResource,
  isValidResourceCategory,
  isValidResourceFileType,
  isValidResourceAccessTier,
} from "../Resource";

describe("Resource entity", () => {
  const baseInput = {
    id: "res_1",
    title: "STR Winner/Bleeder Scanner",
    description: "Paste your search term report; it flags winners and bleeders automatically.",
    category: "automation_tool" as const,
    fileType: "gsheet" as const,
    fileUrl: "https://docs.google.com/spreadsheets/d/abc123/copy",
    accessTier: "STARTER" as const,
  };

  describe("createResource", () => {
    it("creates a published resource with all fields, zero downloads", () => {
      const r = createResource(baseInput);
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      const res = r.value;
      expect(res.id).toBe("res_1");
      expect(res.title).toBe(baseInput.title);
      expect(res.description).toBe(baseInput.description);
      expect(res.category).toBe("automation_tool");
      expect(res.fileType).toBe("gsheet");
      expect(res.fileUrl).toBe(baseInput.fileUrl);
      expect(res.accessTier).toBe("STARTER");
      expect(res.isPublished).toBe(true);
      expect(res.downloadCount).toBe(0);
      expect(res.createdAt).toBeInstanceOf(Date);
      expect(res.updatedAt).toBeInstanceOf(Date);
    });

    it("trims whitespace on title, description, fileUrl", () => {
      const r = createResource({
        ...baseInput,
        title: "  Padded Title  ",
        description: "  Padded description.  ",
        fileUrl: "  https://example.com/file.pdf  ",
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe("Padded Title");
      expect(r.value.description).toBe("Padded description.");
      expect(r.value.fileUrl).toBe("https://example.com/file.pdf");
    });

    it("fails when id is empty", () => {
      const r = createResource({ ...baseInput, id: "  " });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_id");
    });

    it("fails when title is empty", () => {
      const r = createResource({ ...baseInput, title: "  " });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_title");
    });

    it("fails when description is empty", () => {
      const r = createResource({ ...baseInput, description: "" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_description");
    });

    it("fails when category is invalid", () => {
      const r = createResource({
        ...baseInput,
        category: "not_a_category" as unknown as typeof baseInput.category,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_category");
    });

    it("fails when fileType is invalid", () => {
      const r = createResource({
        ...baseInput,
        fileType: "exe" as unknown as typeof baseInput.fileType,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_file_type");
    });

    it("fails when fileUrl is not a valid http(s) URL", () => {
      const r = createResource({ ...baseInput, fileUrl: "not-a-url" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_file_url");
    });

    it("fails when fileUrl uses a non-http(s) protocol", () => {
      const r = createResource({ ...baseInput, fileUrl: "ftp://example.com/file.pdf" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_file_url");
    });

    it("fails when accessTier is invalid", () => {
      const r = createResource({
        ...baseInput,
        accessTier: "ENTERPRISE" as unknown as typeof baseInput.accessTier,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_access_tier");
    });

    it("accepts every valid category and file type", () => {
      const categories = [
        "guide",
        "template",
        "automation_tool",
        "cheat_sheet",
        "handout",
      ] as const;
      const fileTypes = ["pdf", "xlsx", "gsheet", "docx", "zip", "link"] as const;
      for (const category of categories) {
        expect(createResource({ ...baseInput, category }).ok).toBe(true);
      }
      for (const fileType of fileTypes) {
        expect(createResource({ ...baseInput, fileType }).ok).toBe(true);
      }
    });
  });

  describe("updateResource", () => {
    const original = createResource(baseInput);
    if (!original.ok) throw new Error("fixture setup failed");
    const resource = original.value;

    it("updates title", () => {
      const r = updateResource(resource, { title: "New Title" });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe("New Title");
      expect(r.value.updatedAt.getTime()).toBeGreaterThanOrEqual(resource.updatedAt.getTime());
    });

    it("updates isPublished (unpublish/republish)", () => {
      const r = updateResource(resource, { isPublished: false });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.isPublished).toBe(false);
    });

    it("leaves fields untouched when patch omits them", () => {
      const r = updateResource(resource, {});
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.value.title).toBe(resource.title);
      expect(r.value.description).toBe(resource.description);
      expect(r.value.category).toBe(resource.category);
      expect(r.value.fileType).toBe(resource.fileType);
      expect(r.value.fileUrl).toBe(resource.fileUrl);
      expect(r.value.accessTier).toBe(resource.accessTier);
      expect(r.value.isPublished).toBe(resource.isPublished);
    });

    it("fails when patched title is blank", () => {
      const r = updateResource(resource, { title: "   " });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_title");
    });

    it("fails when patched description is blank", () => {
      const r = updateResource(resource, { description: "" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_description");
    });

    it("fails when patched category is invalid", () => {
      const r = updateResource(resource, {
        category: "bogus" as unknown as typeof resource.category,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_category");
    });

    it("fails when patched fileType is invalid", () => {
      const r = updateResource(resource, {
        fileType: "bogus" as unknown as typeof resource.fileType,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_file_type");
    });

    it("fails when patched fileUrl is invalid", () => {
      const r = updateResource(resource, { fileUrl: "nope" });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_file_url");
    });

    it("fails when patched accessTier is invalid", () => {
      const r = updateResource(resource, {
        accessTier: "bogus" as unknown as typeof resource.accessTier,
      });
      expect(r.ok).toBe(false);
      if (r.ok) return;
      expect(r.error.kind).toBe("invalid_access_tier");
    });
  });

  describe("type guards", () => {
    it("isValidResourceCategory", () => {
      expect(isValidResourceCategory("guide")).toBe(true);
      expect(isValidResourceCategory("bogus")).toBe(false);
    });

    it("isValidResourceFileType", () => {
      expect(isValidResourceFileType("pdf")).toBe(true);
      expect(isValidResourceFileType("bogus")).toBe(false);
    });

    it("isValidResourceAccessTier", () => {
      expect(isValidResourceAccessTier("PRO")).toBe(true);
      expect(isValidResourceAccessTier("bogus")).toBe(false);
    });
  });
});
