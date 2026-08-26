import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("/courses page — simulator card elevation contract", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/courses/page.module.css");

  it("uses the simulator card surface, border, and resting shadow", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const match = source.match(/\.card\s*\{([^}]*)\}/);

    expect(match, "the .card default rule must exist").not.toBeNull();
    const card = match![1];
    expect(card).toMatch(/border\s*:\s*1px\s+solid\s+var\(--border\)/);
    expect(card).toMatch(/background\s*:\s*var\(--surface-1\)/);
    expect(card).toMatch(/box-shadow\s*:\s*var\(--sh-1\)/);
  });

  it("raises the card with the simulator hover treatment", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const match = source.match(/\.card:hover\s*\{([^}]*)\}/);

    expect(match, "the .card:hover rule must exist").not.toBeNull();
    const hover = match![1];
    expect(hover).toMatch(/border-color\s*:\s*var\(--c-orange-tint\)/);
    expect(hover).toMatch(/background\s*:\s*var\(--c-card-hi\)/);
    expect(hover).toMatch(/box-shadow\s*:\s*var\(--sh-2\)/);
    expect(hover).toMatch(/transform\s*:\s*translateY\(-2px\)/);
  });

  it("honors reduced motion for the hover lift", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(source).toMatch(/\.card:hover\s*\{\s*transform\s*:\s*none/);
  });
});
