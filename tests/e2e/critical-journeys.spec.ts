/**
 * Critical user journeys — STORY-055.
 *
 * Six end-to-end journeys that exercise the most important product
 * flows. Each test is independent and cleans up after itself.
 */

import { test, expect } from "@playwright/test";
import {
  clearE2EUsers,
  clearE2ESeedData,
  seedAdminAccessScenario,
  seedAdminUser,
  seedCertificate,
} from "./helpers/seed";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

test.describe("Critical journeys", () => {
  // Serial, not parallel: clearE2EUsers()/clearE2ESeedData() delete
  // every "@example.com"/"e2e-"-tagged row, and journeys 3/4/6 depend
  // on a logged-in session surviving across several page loads. Under
  // Playwright's default fullyParallel scheduling, one test's
  // afterEach cleanup can delete another still-running test's seeded
  // user (cascade-deleting its Session row) mid-journey, silently
  // invalidating its session and bouncing it to /login — reproduced
  // locally, both within this file and across files sharing the same
  // "@example.com" convention (e.g. signup.spec.ts). playwright.config.ts
  // already sets `workers: 1` in CI, which serializes the *whole*
  // suite and avoids this there; this `serial` mode is belt-and-
  // suspenders so `pnpm test:e2e` is equally deterministic locally
  // (where workers default to multiple).
  test.describe.configure({ mode: "serial" });

  test.afterEach(async () => {
    if (DATABASE_URL) {
      await clearE2EUsers(DATABASE_URL);
      await clearE2ESeedData(DATABASE_URL);
    }
  });

  test("journey 1: sign up and land on dashboard", async ({ page }) => {
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("Juan");
    await page.getByLabel(/last name/i).fill("Dela Cruz");
    await page.getByLabel(/email address/i).fill(`journey1-${Date.now()}@example.com`);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/dashboard/, { timeout: 15_000 });
    // The dashboard page shows "Welcome back, {firstName}." — the
    // first-name part is dynamic, so we match the static prefix.
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("journey 2: browse courses and view course detail", async ({ page }) => {
    await page.goto(`${BASE}/courses`);
    // The catalog page shows "Course Catalog" as the h1.
    await expect(page.getByRole("heading", { name: /course catalog/i })).toBeVisible();

    // Scope the link search to the catalog grid (skip the public-shell
    // header's "Sign in" / "Sign up" / "Brand" links, which are the
    // first 2-3 links in document order and would cause the test to
    // navigate to /login or /signup instead of a course detail page).
    const catalogGrid = page.locator("main");
    const firstCourse = catalogGrid.getByRole("link").first();
    if (await firstCourse.isVisible().catch(() => false)) {
      await firstCourse.click();
      await expect(page).toHaveURL(/\/courses\/[^/]+$/, { timeout: 10_000 });
    }
  });

  test("journey 3: admin login and create discount code", async ({ page }) => {
    test.skip(!DATABASE_URL, "requires DATABASE_URL to seed an admin user");
    const admin = await seedAdminUser(DATABASE_URL);
    test.skip(!admin, "admin seeding failed — see console warnings");
    if (!admin) return;

    await page.goto(`${BASE}/admin-login`);
    await page.getByLabel(/admin email/i).fill(admin.email);
    await page.getByLabel(/^password$/i).fill(admin.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    await page.goto(`${BASE}/admin/discount-codes/new`);
    const code = `E2E${Date.now()}`;
    await page.getByPlaceholder(/e\.g\. save20/i).fill(code);
    await page.getByRole("button", { name: /create discount code/i }).click();

    await expect(page).toHaveURL(/\/admin\/discount-codes$/, { timeout: 15_000 });
    await expect(page.getByText(code)).toBeVisible();
  });

  test("journey 4: admin login and create course", async ({ page }) => {
    test.skip(!DATABASE_URL, "requires DATABASE_URL to seed an admin user");
    const admin = await seedAdminUser(DATABASE_URL);
    test.skip(!admin, "admin seeding failed — see console warnings");
    if (!admin) return;

    await page.goto(`${BASE}/admin-login`);
    await page.getByLabel(/admin email/i).fill(admin.email);
    await page.getByLabel(/^password$/i).fill(admin.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    await page.goto(`${BASE}/admin/courses/new`);
    const suffix = Date.now();
    await page.locator('input[name="id"]').fill(`e2e-journey4-${suffix}`);
    await page.locator('input[name="slug"]').fill(`e2e-journey4-${suffix}`);
    await page.locator('input[name="title"]').fill(`E2E Journey 4 Course ${suffix}`);
    await page.getByRole("button", { name: /create course/i }).click();

    // createCourseAction redirects to /admin/courses/{id} on success.
    await expect(page).toHaveURL(new RegExp(`/admin/courses/e2e-journey4-${suffix}$`), {
      timeout: 15_000,
    });
    await expect(page.getByText(`E2E Journey 4 Course ${suffix}`)).toBeVisible();
  });

  test("journey 5: admin changes a tier and manages course enrollment", async ({ page }) => {
    test.setTimeout(90_000);
    test.skip(!DATABASE_URL, "requires DATABASE_URL to seed admin access data");
    const [admin, scenario] = await Promise.all([
      seedAdminUser(DATABASE_URL),
      seedAdminAccessScenario(DATABASE_URL),
    ]);
    test.skip(!admin || !scenario, "admin access seeding failed; see console warnings");
    if (!admin || !scenario) return;

    await page.goto(`${BASE}/admin-login`);
    await page.getByLabel(/admin email/i).fill(admin.email);
    await page.getByLabel(/^password$/i).fill(admin.password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/admin/, { timeout: 15_000 });

    const adminPages = [
      ["/admin/content", "Content"],
      ["/admin/quizzes", "Quizzes"],
      ["/admin/simulators", "Simulator scenarios"],
      ["/admin/resources", "Download center"],
      ["/admin/users", "Users"],
    ] as const;
    for (const [path, heading] of adminPages) {
      await page.goto(`${BASE}${path}`);
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
        .toBe(true);
    }

    await page.goto(`${BASE}/admin/users/${scenario.studentId}`);
    await expect(page.getByRole("heading", { name: scenario.studentName })).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
      .toBe(true);

    await page.getByRole("combobox", { name: /tier/i }).selectOption("PRO");
    await page.getByRole("button", { name: /save tier/i }).click();
    await expect(page.getByRole("status")).toContainText("Subscription tier updated");

    const courseRow = page.getByText(scenario.courseTitle).locator("..").locator("..");
    await courseRow.getByRole("button", { name: /^enroll$/i }).click();
    await expect(page.getByRole("status")).toContainText("Course access");
    await expect(courseRow.getByText("Active", { exact: true })).toBeVisible();

    page.once("dialog", (dialog) => dialog.accept());
    await courseRow.getByRole("button", { name: /^revoke$/i }).click();
    await expect(page.getByRole("status")).toContainText("Course access revoked");

    await courseRow.getByRole("button", { name: /^restore$/i }).click();
    await expect(page.getByRole("status")).toContainText("Course access restored");
  });

  test("journey 6: public verifies certificate by hash", async ({ page }) => {
    test.skip(!DATABASE_URL, "requires DATABASE_URL to seed a certificate");
    const cert = await seedCertificate(DATABASE_URL);
    test.skip(!cert, "certificate seeding failed — see console warnings");
    if (!cert) return;

    await page.goto(`${BASE}/certificates/${cert.verificationHash}`);
    // Scope to <main> — the fullName/courseTitle also appear in the
    // page <title>, which getByText() would otherwise also match.
    const main = page.locator("main");
    await expect(page.getByText(/verified certificate/i)).toBeVisible();
    await expect(main.getByText(cert.fullName)).toBeVisible();
    await expect(main.getByText(cert.courseTitle)).toBeVisible();
  });
});
