# STORY-005 · First end-to-end test: Playwright signup happy path

**Sprint:** 1
**Points:** 1
**Epic:** Test infrastructure
**Owner:** Ryan
**Dependencies:** STORY-004

## Goal

Playwright test that signs up, asserts the redirect, asserts the User row exists in the test database. After this story, the e2e test infrastructure is in place, CI runs e2e on every PR, and the signup flow is locked down by a real browser test.

## Acceptance criteria

- [ ] `playwright.config.ts` configured with `webServer` (runs `pnpm build && pnpm start`), base URL `http://localhost:3000`, `testDir: "tests/e2e"`, three viewports (375×812, 768×1024, 1280×800).
- [ ] `tests/e2e/auth/signup.spec.ts` has at least 3 tests: happy path, email-taken, weak-password.
- [ ] `tests/e2e/helpers/db.ts` exports `getTestUser(email)` and `deleteTestUser(email)` using the `DATABASE_URL` env var.
- [ ] `.github/workflows/ci.yml` updated to run `pnpm test:e2e` after the unit/integration tests.
- [ ] `pnpm test:e2e` runs the suite against a clean test database, all tests pass.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` all green.

## Files touched

| File | Action |
|------|--------|
| `tests/e2e/auth/signup.spec.ts` | Create |
| `tests/e2e/helpers/db.ts` | Create |
| `playwright.config.ts` | Modify — `webServer`, `testDir`, projects for the 3 viewports |
| `.github/workflows/ci.yml` | Modify — add `pnpm test:e2e` step |

## Code shape

```ts
// tests/e2e/auth/signup.spec.ts
import { test, expect } from "@playwright/test";
import { getTestUser, deleteTestUser } from "../helpers/db";

test.describe("signup", () => {
  test("happy path: user can sign up and lands on the check-your-email page", async ({ page }) => {
    const email = `test-${Date.now()}@example.com`;
    await deleteTestUser(email);

    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple-9!");
    await page.getByLabel("Display name").fill("Test User");
    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page).toHaveURL("/signup/sent");
    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible();

    const user = await getTestUser(email);
    expect(user).not.toBeNull();
    expect(user!.emailVerifiedAt).toBeNull();
    expect(user!.role).toBe("STUDENT");

    await deleteTestUser(email);
  });

  test("email taken: shows an error and does not create a duplicate", async ({ page }) => {
    const email = `taken-${Date.now()}@example.com`;
    await deleteTestUser(email);
    // first signup succeeds
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple-9!");
    await page.getByLabel("Display name").fill("First User");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page).toHaveURL("/signup/sent");

    // second signup with same email fails
    await page.goto("/signup");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple-9!");
    await page.getByLabel("Display name").fill("Second User");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByRole("alert")).toContainText(/already exists/i);

    await deleteTestUser(email);
  });

  test("weak password: shows the password strength reasons", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Email").fill(`weak-${Date.now()}@example.com`);
    await page.getByLabel("Password").fill("password");
    await page.getByLabel("Display name").fill("Test User");
    await page.getByRole("button", { name: /create account/i }).click();
    await expect(page.getByRole("alert")).toContainText(/password/i);
  });
});
```

```ts
// tests/e2e/helpers/db.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function getTestUser(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function deleteTestUser(email: string) {
  await prisma.user.deleteMany({ where: { email } });
}
```

## Pitfalls

- **The test database is separate from dev.** `playwright.config.ts` sets `DATABASE_URL` to a test-only database (e.g. `amph_test`). The CI workflow spins up a Postgres service container and creates this database before the e2e job.
- **`getByLabel` requires `<label htmlFor>`.** The form must use real labels, not placeholder-as-label. STORY-004 already does this.
- **Tests must be idempotent.** `deleteTestUser` before and after. Don't depend on test execution order.
- **The e2e test runs against the production build**, not the dev server. `playwright.config.ts` uses `webServer: { command: "pnpm start", port: 3000, reuseExistingServer: !process.env.CI }` to spin up the prod build. The dev server is too slow and has different behavior (HMR, devtools).
- **Three viewports are configured via Playwright projects.** Each project runs the same test file with a different viewport. The CI matrix expands the test count, but each individual test is the same.
- **`role: "alert"` is on the error `<p>`.** Use `aria-live="assertive"` or `role="alert"` so screen readers announce the error. The test asserts on the role, not the class name.

## Verification

```bash
DATABASE_URL=postgresql://test:test@localhost:5432/amph_test pnpm test:e2e
# Asserts all 3 tests pass on all 3 viewports
```

Local:
```bash
# Terminal 1: pnpm dev
# Terminal 2: pnpm test:e2e
```

## Definition of Done

- [ ] All files in "Files touched" are present.
- [ ] At least 3 E2E tests: happy, email-taken, weak-password.
- [ ] `pnpm test:e2e` all green locally.
- [ ] CI workflow updated to run `pnpm test:e2e` on every PR.
- [ ] `pnpm typecheck && pnpm lint && pnpm test && pnpm test:e2e && pnpm build` all green.
- [ ] `docs/stories/STORY-005.md` exists (this file).
- [ ] Conventional commit: `test(e2e): signup flow playwright tests (STORY-005)`.
- [ ] PR opened against `main`. CI green. Squash merge.
- [ ] `SESSION-HANDOVER.md` updated with Sprint 1 closing notes.
