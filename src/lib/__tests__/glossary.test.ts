import { describe, expect, it } from "vitest";
import { loadGlossaryManifest, lookupGlossaryTerm, parseGlossaryManifest } from "@/lib/glossary";

describe("loadGlossaryManifest", () => {
  it("loads the published glossary", () => {
    const manifest = loadGlossaryManifest();
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.terms.length).toBeGreaterThanOrEqual(7);
    const slugs = manifest.terms.map((t) => t.slug);
    expect(slugs).toContain("acos");
    expect(slugs).toContain("roas");
    expect(slugs).toContain("cpc");
    expect(slugs).toContain("ctr");
  });
});

describe("lookupGlossaryTerm", () => {
  it("returns the matching term", () => {
    const manifest = loadGlossaryManifest();
    const term = lookupGlossaryTerm(manifest, "acos");
    expect(term).not.toBeNull();
    expect(term?.term).toBe("ACoS");
    expect(term?.shortDefinition).toMatch(/Advertising Cost of Sales/i);
  });

  it("returns null for an unknown slug", () => {
    const manifest = loadGlossaryManifest();
    expect(lookupGlossaryTerm(manifest, "unknown")).toBeNull();
  });
});

describe("parseGlossaryManifest", () => {
  it("rejects a non-object", () => {
    const result = parseGlossaryManifest(null);
    expect(result).toEqual({
      kind: "manifest_invalid",
      message: "Manifest must be an object.",
    });
  });

  it("rejects a missing schemaVersion", () => {
    const result = parseGlossaryManifest({ terms: [] });
    expect(result).toEqual({
      kind: "manifest_invalid",
      message: "Manifest schemaVersion must be 1.",
    });
  });

  it("rejects terms that are not an array", () => {
    const result = parseGlossaryManifest({ schemaVersion: 1, terms: "nope" });
    expect(result).toEqual({
      kind: "manifest_invalid",
      message: "Manifest terms must be an array.",
    });
  });

  it("drops rows with missing fields and skips duplicate slugs", () => {
    const manifest = parseGlossaryManifest({
      schemaVersion: 1,
      terms: [
        { slug: "acos", term: "ACoS", shortDefinition: "a", longDefinition: "b" },
        { slug: "acos", term: "ACoS Duplicate", shortDefinition: "x", longDefinition: "y" },
        { slug: "", term: "Empty", shortDefinition: "a", longDefinition: "b" },
        { slug: "ctr", term: "", shortDefinition: "a", longDefinition: "b" },
      ],
    });
    if ("kind" in manifest) throw new Error("expected ok");
    expect(manifest.terms).toHaveLength(1);
    expect(manifest.terms[0]?.slug).toBe("acos");
  });
});
