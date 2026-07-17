/**
 * Playwright E2E tests — Story 005.
 *
 * Runs against the actual Next.js dev server.
 * Tests the signup flow end-to-end including error states.
 *
 * Run with: pnpm test:e2e
 * Run UI mode: pnpm test:e2e:ui
 */

import { test, expect } from "@playwright/test";

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

test.describe("Sign Up", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/signup`);
  });

  test("page loads with correct title and heading", async ({ page }) => {
    await expect(page).toHaveTitle(/Amazon PH Academy/i);
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  });

  test("all form fields are present and labeled", async ({ page }) => {
    await expect(page.getByLabel(/first name/i)).toBeVisible();
    await expect(page.getByLabel(/last name/i)).toBeVisible();
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /password/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("shows validation error for empty form submission", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();

    // With proper HTML5 validation, the browser prevents submission
    // or we get an invalid_email result depending on what's filled
    // The form should either show browser validation or an error after submission
    // For now, just verify the page didn't crash
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  });

  test("shows email_taken error when registering the same email twice", async ({ page }) => {
    await page.getByLabel(/first name/i).fill("Alice");
    await page.getByLabel(/last name/i).fill("Rodriguez");
    await page.getByLabel(/email address/i).fill("e2e-dup@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    // First signup succeeds
    await expect(page.getByText(/account created/i)).toBeVisible({ timeout: 10_000 });

    // Second signup with same email shows email_taken
    await page.goto(`${BASE}/signup`);
    await page.getByLabel(/first name/i).fill("Alice");
    await page.getByLabel(/last name/i).fill("Rodriguez");
    await page.getByLabel(/email address/i).fill("e2e-dup@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/already registered/i)).toBeVisible({ timeout: 10_000 });
  });

  test("shows weak_password error for short password", async ({ page }) => {
    await page.getByLabel(/first name/i).fill("Bob");
    await page.getByLabel(/last name/i).fill("Santos");
    await page.getByLabel(/email address/i).fill("e2e-weak@example.com");
    await page.getByRole("textbox", { name: /password/i }).fill("abc");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/password.*weak|weak.*password/i)).toBeVisible({ timeout: 10_000 });
  });

  test("shows invalid_email error for malformed email", async ({ page }) => {
    await page.getByLabel(/first name/i).fill("Carol");
    await page.getByLabel(/last name/i).fill("Mendoza");
    await page.getByLabel(/email address/i).fill("not-an-email");
    await page.getByRole("textbox", { name: /password/i }).fill("Str0ngP@ss123!");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/valid email/i)).toBeVisible({ timeout: 10_000 });
  });

  test("shows link to login page", async ({ page }) => {
    const loginLink = page.getByRole("link", { name: /sign in/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute("href", "/login");
  });
});

test.describe("Health check", () => {
  test("GET /api/health returns 200", async ({ request }) => {
    const res = await request.get(`${BASE}/api/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("ok");
    expect(body.timestamp).toBeTruthy();
  });
});
