import { describe, expect, it } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

describe("MobileNavToggle accessibility contract", () => {
  it("uses the shared close path when the toggle closes the drawer", async () => {
    const componentPath = path.resolve(process.cwd(), "src/components/ui/MobileNavToggle.tsx");
    const source = await fs.readFile(componentPath, "utf8");

    expect(source).toMatch(/if \(open\) \{\s*close\(\);\s*return;/);
    expect(source).toContain('sidebar.removeAttribute("role")');
    expect(source).toContain('sidebar.removeAttribute("aria-modal")');
    expect(source).toContain("content.inert = false");
  });
});
