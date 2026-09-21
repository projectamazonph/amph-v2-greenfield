/**
 * Playwright E2E tests — STORY-129 first-run welcome tour.
 *
 * Exercises the full onboarding slice end-to-end:
 *   1. No-tier signup lands on /welcome (Task 8 rerouted /dashboard
 *      → /welcome so fresh students go through the onboarding wizard).
 *   2. The 5-step stepper walks the student through the product
 *      surface ("dashboard", "courses", "simulators", etc.).
 *   3. The final step's "Take me to my dashboard" CTA calls
 *      `completeWelcomeAction`, which marks `welcomeCompletedAt` and
 *      `router.push("/dashboard")`.
 *   4. After completion, the regular student dashboard renders — the
 *      `NewUserDashboard` variant only shows when `welcomeCompletedAt`
 *      is still null (see /dashboard/page.tsx). The variant's own
 *      test below reaches it by navigating to /dashboard before
 *      finishing the tour.
 *
 * Best-effort DB cleanup after each test (the helper is a no-op when
 * `DATABASE_URL` is empty — see tests/e2e/helpers/seed.ts).
 *
 * Run with: `pnpm test:e2e welcome.spec.ts`.
 */

import { test, expect } from "@playwright/test";
import { clearE2EUsers } from "./helpers/seed";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const DATABASE_URL = process.env.DATABASE_URL ?? "";

test.describe("Welcome tour (STORY-129)", () => {
  test.afterEach(async () => {
    if (DATABASE_URL) {
      await clearE2EUsers(DATABASE_URL);
    }
  });

  test("new user signs up, walks all 5 steps, and lands on /dashboard", async ({ page }) => {
    // ── 1. Sign up (no tier) ──────────────────────────────────────────
    // Task 8 rerouted no-tier signups from /dashboard to /welcome.
    const email = `e2e-welcome-${Date.now()}@example.com`;
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("Maria");
    await page.getByLabel(/last name/i).fill("Santos");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // ── 2. Land on /welcome ───────────────────────────────────────────
    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
    // Step 1 mounts (eyebrow + title). The stepper URL fragment
    // (`#step-0`) makes a strict end-anchor impossible — match the
    // /welcome path prefix only.
    await expect(page.getByText(/Welcome to AMPH Academy/i)).toBeVisible();
    await expect(page.getByText(/Step 1 of 5/i)).toBeVisible();

    // ── 3. Step 1 → 2 ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /start the tour/i }).click();
    await expect(page.getByText(/Your dashboard is your home base/i)).toBeVisible();
    await expect(page.getByText(/Step 2 of 5/i)).toBeVisible();

    // ── 4. Step 2 → 3 ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /^next$/i }).click();
    await expect(page.getByText(/Courses and lessons/i)).toBeVisible();
    await expect(page.getByText(/Step 3 of 5/i)).toBeVisible();

    // ── 5. Step 3 → 4 ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /^next$/i }).click();
    await expect(page.getByText(/practice without burning real ad spend/i)).toBeVisible();
    await expect(page.getByText(/Step 4 of 5/i)).toBeVisible();

    // ── 6. Step 4 → 5 ─────────────────────────────────────────────────
    await page.getByRole("button", { name: /^next$/i }).click();
    await expect(page.getByText(/You're ready to start/i)).toBeVisible();
    await expect(page.getByText(/Step 5 of 5/i)).toBeVisible();

    // ── 7. Finish — `completeWelcomeAction` + router.push("/dashboard")
    // After completion `welcomeCompletedAt` is set, so /dashboard shows
    // the regular variant ("Welcome back, {firstName}.") — not the
    // `NewUserDashboard` first-run variant, which only renders while
    // welcome is incomplete AND no enrollments exist.
    await page.getByRole("button", { name: /take me to my dashboard/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /welcome back, maria/i })).toBeVisible();
  });

  test("NewUserDashboard variant renders when /dashboard is visited before completing the tour", async ({
    page,
  }) => {
    // The first-run dashboard variant
    // (src/components/student/NewUserDashboard.tsx) only renders when
    // `welcomeCompletedAt === null` AND there are no active
    // enrollments. After `completeWelcomeAction` runs the timestamp is
    // set, so the previous test cannot reach it — we exercise it here
    // by signing up (lands on /welcome) and then navigating directly to
    // /dashboard without finishing the tour.
    const email = `e2e-newdash-${Date.now()}@example.com`;
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("Jose");
    await page.getByLabel(/last name/i).fill("Reyes");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
    await expect(page.getByText(/Welcome to AMPH Academy/i)).toBeVisible();

    // Bypass the stepper and land on /dashboard. The variant's hero
    // greets the student differently from the regular dashboard: it
    // says "Welcome to AMPH, {firstName}." (vs. "Welcome back, …") and
    // its subtitle starts with "Pick a course to start learning".
    await page.goto(`${BASE}/dashboard`);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /welcome to amph, jose/i })).toBeVisible();
    await expect(page.getByText(/Pick a course to start learning/i)).toBeVisible();
  });

  test("'Skip tour' on /welcome lands the user on /dashboard", async ({ page }) => {
    // The "Skip tour" link on the first four steps calls the same
    // `handleFinish()` as the final step's "Take me to my dashboard"
    // button — it calls `completeWelcomeAction` and routes to
    // /dashboard. This is the path an impatient student would take.
    const email = `e2e-skip-${Date.now()}@example.com`;
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("Ana");
    await page.getByLabel(/last name/i).fill("Lim");
    await page.getByLabel(/email address/i).fill(email);
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/welcome/, { timeout: 15_000 });
    await page.getByRole("button", { name: /skip tour/i }).click();
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  });
});
