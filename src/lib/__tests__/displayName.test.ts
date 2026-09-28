import { describe, expect, it } from "vitest";
import { displayName } from "@/lib/displayName";

describe("displayName", () => {
  it("title-cases single-word messy casing", () => {
    expect(displayName("RYan")).toBe("Ryan");
    expect(displayName("john")).toBe("John");
    expect(displayName("McDONALD")).toBe("Mcdonald");
  });

  it("title-cases multi-word names", () => {
    expect(displayName("RYan Dabao")).toBe("Ryan Dabao");
    expect(displayName("john smith")).toBe("John Smith");
  });

  it("preserves uppercase acronyms the user typed on purpose", () => {
    expect(displayName("IBM Watson")).toBe("IBM Watson");
    expect(displayName("AMPH admin")).toBe("AMPH Admin");
  });

  it("preserves intra-name separators (apostrophe, hyphen, em dash)", () => {
    // Standard convention: capitalise the letter after an apostrophe
    // (so "o'brien" becomes "O'Brien", not "O'brien").
    expect(displayName("o'brien")).toBe("O'Brien");
    expect(displayName("mary-jane")).toBe("Mary-Jane");
  });

  it("returns empty for nullish / blank input", () => {
    expect(displayName(null)).toBe("");
    expect(displayName(undefined)).toBe("");
    expect(displayName("")).toBe("");
    expect(displayName("   ")).toBe("");
  });
});
