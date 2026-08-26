import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const cssPath = path.resolve(process.cwd(), "src/components/ui/ConfirmDialog.module.css");

describe("ConfirmDialog simulator overlay contract", () => {
  it("uses a dim backdrop without decorative blur", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const backdrop = source.match(/\.dialog::backdrop\s*\{([^}]*)\}/)?.[1];

    expect(backdrop, "the .dialog::backdrop rule must exist").toBeDefined();
    expect(backdrop).toMatch(/background\s*:\s*rgba\(/);
    expect(backdrop).not.toMatch(/backdrop-filter\s*:/);
  });

  it("uses the simulator card elevation and semantic destructive action", async () => {
    const source = await fs.readFile(cssPath, "utf8");
    const dialog = source.match(/\.dialog\s*\{([^}]*)\}/)?.[1];
    expect(dialog).toMatch(/box-shadow\s*:\s*var\(--sh-4\)/);
    expect(source).toMatch(/^\.confirmDestructive\s*\{\s*\n\s*border-color:\s*var\(--c-red\)/m);
  });

  it("keeps the UI primitive layer free of backdrop-filter blur", async () => {
    const uiDir = path.resolve(process.cwd(), "src/components/ui");
    const entries = await fs.readdir(uiDir, { withFileTypes: true });
    const offenders: string[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith(".module.css")) continue;
      const source = await fs.readFile(path.join(uiDir, entry.name), "utf8");
      if (/backdrop-filter\s*:\s*[^;}]*blur/i.test(source)) offenders.push(entry.name);
    }

    expect(offenders).toEqual([]);
  });
});
