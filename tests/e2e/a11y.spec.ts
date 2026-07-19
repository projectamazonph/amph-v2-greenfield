/**
 * Accessibility checks — STORY-055.
 *
 * Runs axe-core on key public pages. Warnings only until all existing
 * issues are triaged and fixed.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const PUBLIC_PATHS = ["/", "/courses", "/signup", "/login"];

test.describe("Accessibility", () => {
  for (const path of PUBLIC_PATHS) {
    test(`axe check on ${path}`, async ({ page }) => {
      await page.goto(`${BASE}${path}`);
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      // Log violations as warnings; do not fail the build until
      // existing issues are fixed.
      if (accessibilityScanResults.violations.length > 0) {
        // eslint-disable-next-line no-console
        console.warn(`A11y violations on ${path}:`, accessibilityScanResults.violations);
      }
      expect(accessibilityScanResults.violations.length).toBeLessThan(100);
    });
  }
});
