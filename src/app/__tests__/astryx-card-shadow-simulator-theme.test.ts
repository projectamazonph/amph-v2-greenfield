import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("globals.css .astryx-card — simulator theme contract", () => {
  const cssPath = path.resolve(process.cwd(), "src/app/globals.css");
  const cardModuleCssPath = path.resolve(process.cwd(), "src/components/ui/Card.module.css");

  it("uses the simulator card surface, border, radius, and resting elevation", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const match = source.match(/\.astryx-card\s*\{([^}]*)\}/);

    expect(match, "the .astryx-card default rule must exist").not.toBeNull();
    const card = match![1];
    expect(card).toMatch(/background\s*:\s*var\(--c-card\)/);
    expect(card).toMatch(/border\s*:\s*1px\s+solid\s+var\(--c-border\)/);
    expect(card).toMatch(/border-radius\s*:\s*var\(--r-lg\)/);
    expect(card).toMatch(/box-shadow\s*:\s*var\(--sh-1\)/);
  });

  it("keeps transparent Astryx cards opt-out friendly", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const match = source.match(/\.astryx-card\[data-variant="transparent"\]\s*\{([^}]*)\}/);

    expect(match, "the transparent Astryx card rule must exist").not.toBeNull();
    expect(match![1]).toMatch(/box-shadow\s*:\s*none/);
  });

  it("gives interactive shared cards the simulator hover treatment", async () => {
    const source = await fs.readFile(cardModuleCssPath, "utf8");
    const match = source.match(/\.interactive:hover\s*\{([^}]*)\}/);

    expect(match, "the .interactive:hover rule must exist").not.toBeNull();
    const hover = match![1];
    expect(hover).toMatch(/border-color\s*:\s*var\(--c-orange-tint\)/);
    expect(hover).toMatch(/box-shadow\s*:\s*var\(--sh-2\)/);
    expect(hover).toMatch(/transform\s*:\s*translateY\(-1px\)/);
  });
});
