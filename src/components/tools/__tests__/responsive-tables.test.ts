/**
 * Responsive data-table contract.
 *
 * The student simulators use dense numeric tables. At phone widths each table
 * must stay inside its card and offer a horizontal scroll region rather than
 * pushing the page wider or clipping values.
 */

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const TABLES = [
  ["../BidElevatorForm.tsx", "../BidElevatorForm.module.css"],
  ["../BidElevatorResult.tsx", "../BidElevatorResult.module.css"],
  ["../StrTriageForm.tsx", "../StrTriageForm.module.css"],
] as const;

describe("student simulator tables", () => {
  it("wraps every dense table in a named horizontal scroll region", () => {
    for (const [componentPath, stylesheetPath] of TABLES) {
      const component = readFileSync(new URL(componentPath, import.meta.url), "utf8");
      const stylesheet = readFileSync(new URL(stylesheetPath, import.meta.url), "utf8");

      expect(component).toContain("className={styles.tableScroll}");
      expect(component).toContain('role="region"');
      expect(stylesheet).toMatch(/\.tableScroll\s*\{[\s\S]*?overflow-x:\s*auto;/);
      expect(stylesheet).toMatch(/\.table\s*\{[\s\S]*?min-width:\s*\d+px;/);
    }
  });
});
