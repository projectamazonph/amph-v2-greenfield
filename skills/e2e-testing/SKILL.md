---
name: e2e-testing
displayName: End-to-End Testing (Playwright)
version: "1.0.0"
summary: Patterns and best practices for end-to-end testing with Playwright.
license: MIT
description: Use when designing, writing, or debugging Playwright end-to-end tests for web applications.
---

# End-to-End Testing with Playwright

## When to Use

- Writing browser-level integration tests
- Verifying user-facing flows across multiple routes
- Smoke tests for critical journeys (signup, checkout, login)
- Cross-browser compatibility verification

## Core Principles

1. **Test user behavior, not implementation.** Assert on what users see and do.
2. **Each test = one user journey.** Don't bundle multiple assertions into one test.
3. **Independent tests.** No shared state, no test ordering dependency.
4. **Fast feedback.** A failing test should point to the exact broken flow.
5. **Stable locators.** Use semantic selectors (`getByRole`, `getByLabel`, `getByText`) before CSS/XPath.

## Test Structure

```typescript
import { test, expect } from '@playwright/test';

test('user can complete signup', async ({ page }) => {
  // Arrange — navigate to starting point
  await page.goto('/signup');

  // Act — perform the user flow
  await page.getByLabel('Email').fill('user@example.com');
  await page.getByLabel('Password').fill('secure-password');
  await page.getByRole('button', { name: 'Create account' }).click();

  // Assert — verify the outcome
  await expect(page).toHaveURL('/dashboard');
  await expect(page.getByRole('heading', { name: 'Welcome' })).toBeVisible();
});
```

## Locator Priority

1. `getByRole('button', { name: 'Submit' })` — best
2. `getByLabel('Email')` — for form fields
3. `getByText('Welcome back')` — for visible text
4. `getByTestId('submit-btn')` — last resort, when role/text unavailable
5. CSS selectors — avoid

## Common Patterns

### Waiting
```typescript
// Good — wait for a condition
await expect(page.getByText('Loaded')).toBeVisible();

// Bad — fixed timeout
await page.waitForTimeout(2000);
```

### Authentication in Tests
```typescript
// Reuse authenticated state across tests
test.use({ storageState: 'playwright/.auth/user.json' });

test('authenticated user can checkout', async ({ page }) => {
  // Already logged in
});
```

### Visual Regression
```typescript
await expect(page).toHaveScreenshot('homepage.png', {
  maxDiffPixelRatio: 0.02,
});
```

## Anti-Patterns

- `await page.waitForTimeout(N)` — use condition-based waits
- `page.locator('.btn-class').click()` — use semantic locators
- `await page.textContent('#hidden-value')` — tests shouldn't read internal state
- Sharing setup across tests via global variables — use `beforeEach`
- Test data from production — use fixtures and factories

## Test Organization

```
tests/e2e/
├── auth/           # Login, signup, password reset
├── checkout/       # Payment flows
├── courses/        # Course catalog, lessons
├── tools/          # Simulator interactions
├── fixtures/       # Reusable test data and auth state
└── helpers/        # Custom commands, page objects
```

## Debugging Failures

1. `await page.pause()` — step through manually
2. `--headed` — see browser
3. `--debug` — opens inspector
4. Trace viewer — `npx playwright show-trace trace.zip`
5. Screenshots on failure — auto-captured in CI

## Critical Journeys to Cover

For any web app, at minimum:
1. Anonymous → pricing → signup → empty dashboard
2. Signup → checkout (test mode) → enrollment → first lesson
3. Lesson → quiz → pass → next module
4. Critical user tool / feature flow
5. Admin: create → edit → audit trail verification
6. Auth boundary: invalid login → rate-limited

## CI Integration

```yaml
# .github/workflows/e2e.yml
- name: Playwright tests
  run: pnpm test:e2e
- uses: actions/upload-artifact@v4
  if: failure()
  with:
    name: playwright-traces
    path: test-results/
```

## Accessibility

Every E2E test should include:
```typescript
import AxeBuilder from '@axe-core/playwright';

test('page is accessible', async ({ page }) => {
  await page.goto('/');
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});
```

## References

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Locators](https://playwright.dev/docs/locators)
- [Axe Accessibility Testing](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)