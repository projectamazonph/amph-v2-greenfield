import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : undefined,
  },
  projects: [
    {
      // devices["iPhone 13"] sets defaultBrowserType: "webkit" (it's
      // modeled on real Safari/iOS). Left unoverridden, this project's
      // name ("chromium-mobile") lied: every run actually launched
      // WebKit, not Chromium, and WebKit's handling of this app's plain
      // <form method="POST"> signup submission consistently hung past
      // the 15s dashboard-redirect timeout in CI (repro'd locally, the
      // click never triggers navigation at all, the page stays on
      // /signup). The explicit browserName below takes precedence over
      // the inherited defaultBrowserType, making the project actually
      // test what its name claims (Chromium at a mobile viewport/touch
      // profile) and resolving the timeout.
      name: "chromium-mobile",
      use: { ...devices["iPhone 13"], browserName: "chromium" },
    },
    {
      // Same defaultBrowserType: "webkit" issue as above, devices["iPad
      // (gen 7)"] is also modeled on real Safari.
      name: "chromium-tablet",
      use: { ...devices["iPad (gen 7)"], browserName: "chromium" },
    },
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    cwd: process.env.PLAYWRIGHT_CWD ?? undefined,
  },
});
