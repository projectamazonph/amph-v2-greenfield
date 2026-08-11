import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

async function source(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

describe("public accessibility release gates", () => {
  it("fails Playwright when axe finds a violation and includes pricing", async () => {
    const spec = await source("tests/e2e/a11y.spec.ts");

    expect(spec).toContain('"/pricing"');
    expect(spec).toContain("expect(accessibilityScanResults.violations).toEqual([])");
    expect(spec).not.toContain("toBeLessThan(100)");
  });

  it("hard-fails Lighthouse category assertions", async () => {
    const workflow = await source(".github/workflows/ci.yml");
    const config = await source(".lighthouserc.json");

    expect(workflow).not.toMatch(/--config=\.\/\.lighthouserc\.json\s*\\?\s*\|\| true/);
    expect(config).not.toContain('"preset": "lighthouse:no-pwa"');
  });

  it("keeps landing headings sequential and the brand name visible to assistive tech", async () => {
    const bidElevator = await source("src/components/landing/BidElevator.tsx");
    const footer = await source("src/components/landing/Footer.tsx");
    const topBar = await source("src/components/landing/TopBar.tsx");

    expect(bidElevator).not.toContain("<h4>");
    expect(footer).not.toContain("<h5>");
    expect(topBar).not.toContain('aria-label="Project Amazon PH home"');
  });

  it("declares a light-surface accent and responsive hero image sizes", async () => {
    const globals = await source("src/app/globals.css");
    const hero = await source("src/components/landing/Hero.tsx");

    expect(globals).toContain("--accent-text:");
    expect(hero).toContain("sizes=");
  });

  it("contains standalone authentication forms in main landmarks", async () => {
    const login = await source("src/app/login/LoginForm.tsx");
    const signup = await source("src/app/signup/SignupForm.tsx");

    expect(login).toContain("<main className={styles.page}>");
    expect(signup).toContain("<main className={styles.page}>");
  });

  it("keeps the course catalog error state headed", async () => {
    const courses = await source("src/app/courses/page.tsx");

    expect(courses).toContain("<h1 className={styles.errorTitle}>Courses unavailable</h1>");
  });
});
