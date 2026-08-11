/**
 * Accessibility checks — STORY-055.
 *
 * Runs axe-core on key public pages and fails on any violation.
 */

import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

const PUBLIC_PATHS = ["/", "/courses", "/pricing", "/signup", "/login", "/faq"];

test.describe("Accessibility", () => {
  for (const path of PUBLIC_PATHS) {
    test(`axe check on ${path}`, async ({ page }) => {
      const response = await page.goto(`${BASE}${path}`);
      expect(response?.ok()).toBe(true);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("h1")).toBeVisible();
      const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
      expect(accessibilityScanResults.violations).toEqual([]);
    });
  }
});
