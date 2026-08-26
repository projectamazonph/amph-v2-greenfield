import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const rule = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
};

describe("simulator learning surfaces", () => {
  const files = [
    "src/components/lesson/SelfCheck.module.css",
    "src/components/lesson/PitfallCallout.module.css",
    "src/components/lesson/ProcessDiagram.module.css",
    "src/components/lesson/TradeOffTable.module.css",
    "src/components/admin/ImpersonationBanner.module.css",
  ];

  it("removes legacy fallback hex palettes from the shared learning surfaces", () => {
    for (const file of files) {
      expect(source(file), file).not.toMatch(/var\([^)]*,\s*#[0-9a-f]{3,8}\)/i);
    }
  });

  it("gives the self-check a simulator card, selected state, and primary control", () => {
    const css = source("src/components/lesson/SelfCheck.module.css");

    expect(rule(css, ".selfCheck")).toMatch(/box-shadow:\s*var\(--sh-1\)/);
    expect(rule(css, ".option:has\(input:checked\)")).toMatch(/background:\s*var\(--c-orange-soft\)/);
    expect(rule(css, ".submit")).toMatch(/background:\s*var\(--c-orange\)/);
  });

  it("uses semantic simulator states for lesson annotations and account warnings", () => {
    const callout = source("src/components/lesson/PitfallCallout.module.css");
    const banner = source("src/components/admin/ImpersonationBanner.module.css");

    expect(rule(callout, ".info .iconSlot")).toMatch(/background:\s*var\(--c-blue-bg\)/);
    expect(rule(callout, ".warning .iconSlot")).toMatch(/background:\s*var\(--c-amber-bg\)/);
    expect(rule(callout, ".pitfall .iconSlot")).toMatch(/background:\s*var\(--c-red-bg\)/);
    expect(rule(banner, ".banner")).toMatch(/background:\s*var\(--c-red-bg\)/);
  });

  it("keeps diagrams and comparison tables readable at small widths", () => {
    const process = source("src/components/lesson/ProcessDiagram.module.css");
    const table = source("src/components/lesson/TradeOffTable.module.css");

    expect(rule(process, ".list")).toMatch(/box-shadow:\s*var\(--sh-1\)/);
    expect(process).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.connector\s*\{\s*display:\s*none/);
    expect(rule(table, ".table")).toMatch(/min-width:\s*560px/);
    expect(rule(table, ".table thead th")).toMatch(/background:\s*var\(--c-navy-2\)/);
  });
});
