import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { describe, expect, it } from "vitest";

async function source(path: string): Promise<string> {
  return readFile(new URL(`../../${path}`, import.meta.url), "utf8");
}

async function routeFiles(directory: string, filename: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const path = join(directory, entry.name);
      return entry.isDirectory()
        ? routeFiles(path, filename)
        : Promise.resolve(entry.name === filename ? [path] : []);
    }),
  );
  return files.flat();
}

describe("public accessibility release gates", () => {
  it("fails Playwright when axe finds a violation and includes pricing", async () => {
    const spec = await source("tests/e2e/a11y.spec.ts");

    expect(spec).toContain('"/pricing"');
    expect(spec).toContain("page.locator('main[aria-busy=\"true\"]')");
    expect(spec).toContain('page.locator("main")).toHaveCount(1)');
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

  it("declares surface-appropriate accents and responsive hero image sizes", async () => {
    const globals = await source("src/app/globals.css");
    const curriculum = await source("src/components/landing/Curriculum.module.css");
    const hero = await source("src/components/landing/Hero.tsx");

    expect(globals).toContain("--accent-text:");
    expect(globals).toContain("--accent-inverse:");
    expect(curriculum).toMatch(/\.table tfoot b\s*{\s*color: var\(--accent-inverse\);\s*}/);
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

  it("exposes non-admin loading states as busy main landmarks", async () => {
    const app = join(process.cwd(), "src", "app");
    const files = (await routeFiles(app, "loading.tsx")).filter(
      (file) => !relative(app, file).startsWith("admin/"),
    );
    const violations = await Promise.all(
      files.map(async (file) => {
        const body = await readFile(file, "utf8");
        return body.includes("<main") && body.includes('aria-busy="true"')
          ? null
          : relative(process.cwd(), file);
      }),
    );

    expect(violations.filter(Boolean)).toEqual([]);
  });

  it("provides a loading state for every non-admin page", async () => {
    const app = join(process.cwd(), "src", "app");
    const pages = (await routeFiles(app, "page.tsx")).filter(
      (file) => !relative(app, file).startsWith("admin/"),
    );
    const loadingDirectories = new Set(
      (await routeFiles(app, "loading.tsx")).map((file) => dirname(file)),
    );
    const missing = pages
      .map((file) => dirname(file))
      .filter((directory) => !loadingDirectories.has(directory))
      .map((directory) => relative(process.cwd(), directory));

    expect(missing).toEqual([]);
  });

  it("announces client-side student mutation outcomes", async () => {
    const enrollment = await source("src/app/courses/[slug]/EnrollButton.tsx");
    const recording = await source("src/components/student/LiveClassRecordingButton.tsx");
    const reset = await source("src/components/auth/ResetConfirmForm.tsx");

    expect(enrollment).toContain('className={styles.success} role="status"');
    expect(enrollment.match(/role="alert"/g)).toHaveLength(3);
    expect(recording).toContain('role="status"');
    expect(reset).toContain('className={styles.success} role="status"');
  });
});
