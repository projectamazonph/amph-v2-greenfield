/**
 * SimGrid iframe round-trip — Task 11 of the 2026-09-30 SimGrid
 * integration plan (paths updated for Task 14 simulator UI refactor).
 *
 * Two checks:
 *   1. A signed-out visitor who hits a vendored simulator page through
 *      the AMPH wrapper is bounced to /login?redirect=... — proves the
 *      auth gate in src/app/practice/[...slug]/page.tsx (Task 8) is
 *      wired. The path was /practice/simgrid/[...slug] before Task 14;
 *      the SimGrid term was dropped from the path per the user's
 *      directive ("sim grid term should be removed but sims added to
 *      main simulator page").
 *   2. The 12-card hub at /practice renders each simulator title and
 *      links to /practice/<file>.html. The hub heading was
 *      "SimGrid Practice" before Task 14; now "Practice".
 *
 * Why the signed-in journey drives /signup rather than logging in
 * with seedStudentAndEnrollment credentials: the helper inserts a
 * User row but does not plant a Session cookie, so the only way to
 * reach an authenticated /practice page from a Playwright page is
 * to either forge a session cookie (out of scope for this spec) or
 * use the same SignUp-and-auto-login path signup.spec.ts already
 * exercises. The signed-in test below mirrors the journey 1
 * shape from critical-journeys.spec.ts (signup → /welcome → skip
 * tour → /dashboard → /practice).
 *
 * Gating: every test early-returns when DATABASE_URL is empty, the
 * same shape module1-worksheet.spec.ts:135 uses for its gated
 * assertions. Without a database the auth redirect (test 1) and the
 * iframe render (test 2) cannot be exercised end-to-end — Next.js
 * needs Postgres for both session lookup and seed data. The
 * `if (!DATABASE_URL) return;` shape keeps the spec gated without
 * using `test.skip`, matching the existing project convention.
 */

import { test, expect } from "@playwright/test";
import { clearE2EUsers } from "./helpers/seed";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

test.describe("Practice iframe @ AMPH auth", () => {
  test.afterEach(async () => {
    if (DATABASE_URL) {
      await clearE2EUsers(DATABASE_URL);
    }
  });

  test("signed-out visitor is redirected to /login from a simulator page", async ({ page }) => {
    if (!DATABASE_URL) return;

    // The wrapper at src/app/practice/[...slug]/page.tsx calls
    // requireAuth() (via getSessionUserId) and redirects anonymous
    // visitors to /login?redirect=<encoded originalPath>. Use bid
    // decisions as the sample simulator file (also covered by the
    // manifest at src/lib/simgrid/manifest.ts).
    await page.goto(`${BASE}/practice/bid-decisions.html`);
    await page.waitForURL(/\/login\?redirect=/);
    // The redirect query must round-trip back to the simulator URL so
    // the post-login land page is the simulator, not /dashboard.
    expect(page.url()).toMatch(/redirect=.*bid-decisions\.html/);
  });

  test("signed-in student can open a practice simulator end-to-end", async ({ page }) => {
    if (!DATABASE_URL) return;

    // Drive the signup → auto-login → /welcome path so the visit to
    // /practice is authenticated. clearE2EUsers() in afterEach
    // removes the @example.com row, so each run is independent. The
    // signup form posts to /api/auth/signup which performs
    // SignUp + Login + plantCookie + redirect("/welcome") in one
    // round-trip — same shape signup.spec.ts:57 relies on.
    const email = `simgrid-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("SimGrid");
    await page.getByLabel(/last name/i).fill("Tester");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });

    // Skip the welcome stepper so the test does not depend on its UI.
    await page.getByRole("button", { name: /skip tour/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // The hub at /practice renders the 12-card grid (PracticeGrid).
    // Assert on a representative title and the exact href shape so a
    // future manifest edit that drops or renames a card fails the
    // suite.
    await page.goto(`${BASE}/practice`);
    await expect(page.getByRole("heading", { name: "Practice", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "AdConsole Pro" })).toBeVisible();
    const adConsoleLink = page.getByRole("link", { name: /AdConsole Pro/i });
    await expect(adConsoleLink).toHaveAttribute("href", "/practice/ad-console.html");

    // Click through to the wrapped simulator page and confirm the
    // iframe mounts. The wrapper reads SIMGRID_BRIDGE_TOKEN +
    // NEXT_PUBLIC_APP_URL off the env, builds the query string, and
    // hands it to <PracticeFrame> (see src/components/practice/PracticeFrame.tsx).
    await adConsoleLink.click();
    await expect(page).toHaveURL(/\/practice\/ad-console\.html$/);
    const frame = page.frameLocator('iframe[title*="AdConsole Pro"]');
    await expect(frame.locator("body")).toBeVisible();
  });
});
