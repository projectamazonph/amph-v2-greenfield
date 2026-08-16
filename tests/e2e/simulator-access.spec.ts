/**
 * Simulator access smoke test - student journey from root UX.
 *
 * Story: Investigate "students unable to access simulators."
 *
 * This test drives the full student flow from a fresh signup, then
 * navigates the simulator index at /tools and exercises each simulator
 * to verify a freshly-registered student can:
 *  - reach the /tools index
 *  - see all 5 registered simulators listed
 *  - open each simulator page without an error
 *  - submit a graded attempt (Practice mode) on at least one simulator
 *  - read the resulting score/feedback
 *
 * The test is intentionally additive to critical-journeys.spec.ts and
 * is run only when DATABASE_URL is set, since the signup flow hits the
 * real database (no in-memory fake).
 *
 * Tag: serial mode (same constraint as critical-journeys ΓÇö signup
 * writes to the public.users table, and the afterEach cleanup deletes
 * every @example.com row, so a parallel test could lose its seeded
 * student mid-flight).
 */

import { test, expect } from "@playwright/test";
import { clearE2EUsers } from "./helpers/seed";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

test.describe("Simulator access from root UX", () => {
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    if (DATABASE_URL) {
      await clearE2EUsers(DATABASE_URL);
    }
  });

  test("fresh student can sign up, reach /tools, and submit a simulator attempt", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    test.skip(!DATABASE_URL, "requires DATABASE_URL to run the signup flow");

    // ΓöÇΓöÇ 1. Sign up from the root marketing page ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    await page.goto(`${BASE}/signup`);
    // Include a strong random suffix so this test file's signup does
    // not collide with itself when Playwright runs the same spec in
    // parallel across browser projects (chromium-desktop,
    // chromium-mobile, chromium-tablet). Date.now() alone is too
    // coarse ΓÇö three parallel calls within the same millisecond would
    // share the same email, and the second signup gets redirected
    // back to /signup?error=email_taken.
    const email = `sim-access-${Date.now()}-${Math.random().toString(36).slice(2, 10)}@example.com`;
    await page.getByLabel(/first name/i).fill("Maria");
    await page.getByLabel(/last name/i).fill("Santos");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // Signup should land on the dashboard, not on a 401/403 page.
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });

    // ΓöÇΓöÇ 2. Navigate to /tools (the simulator index) ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    await page.goto(`${BASE}/tools`);

    // The /tools page lists every registered simulator. If the user
    // were bounced to /login here, the heading would not render.
    await expect(page.getByRole("heading", { name: "Tools", exact: true })).toBeVisible();

    // All 5 registered simulators MUST be listed. The ad-console is
    // listed too but is not a registered simulator (it's an embed).
    const expectedSimulators = [
      "Bid Elevator",
      "Search Term Triage",
      "Campaign Builder",
      "Listing Audit",
      "Keyword Research",
    ];
    for (const name of expectedSimulators) {
      await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    }

    // ΓöÇΓöÇ 3. Open each simulator page and verify it loads ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // Visit every simulator page. Each must render its scenario
    // heading (h1) and an interactive form button. The eyebrow text
    // reads "Simulator" in the DOM (CSS uppercases it for display);
    // the source text comes from <span>Simulator</span> in each page
    // file.
    const expectedForms: Array<{ path: string; actionLabel: RegExp }> = [
      { path: "/tools/bid-elevator", actionLabel: /run simulation/i },
      { path: "/tools/str-triage", actionLabel: /grade my triage/i },
      { path: "/tools/campaign-builder", actionLabel: /submit for grading/i },
      { path: "/tools/listing-audit", actionLabel: /run audit/i },
      { path: "/tools/keyword-research", actionLabel: /generate keywords/i },
    ];

    for (const { path, actionLabel } of expectedForms) {
      await page.goto(`${BASE}${path}`);
      // The action button is the strongest signal that the page has
      // hydrated. If the page errored (missing scenario, broken
      // scenario content, etc.) the action button would not mount.
      await expect(page.getByRole("button", { name: actionLabel })).toBeVisible({
        timeout: 15_000,
      });
      // The page must also render the scenario heading (h1) ΓÇö every
      // simulator page banner is <h1>{scenario.name}</h1>.
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    }

    // ΓöÇΓöÇ 4. Submit a graded attempt on the bid-elevator ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
    // The opened-page checks above prove the pages mount. This step
    // proves the server action reaches StartSimulatorAttempt and
    // returns a real score ΓÇö the most common failure mode for the 401s
    // we've seen in the dev-server log is getSessionUserId() returning
    // null because the session row was deleted (logout, admin revoke,
    // etc.) ΓÇö the page would still render but the submit would fail.
    await page.goto(`${BASE}/tools/bid-elevator`);
    await expect(
      page.getByRole("button", { name: /run simulation/i }),
    ).toBeVisible();
    await page.getByRole("button", { name: /run simulation/i }).click();

    // A successful attempt renders a "Result" heading + a /100 score.
    // The action returns Result with the score, so the UI mounts the
    // result region. If the action returned unauthorized, the UI would
    // surface an error message instead ΓÇö that would NOT mount the
    // "Result" heading.
    await expect(page.getByRole("heading", { name: "Result", exact: true })).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByText(/\/100/)).toBeVisible();
  });
});
