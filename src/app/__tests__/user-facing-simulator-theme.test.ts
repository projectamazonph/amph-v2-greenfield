import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const rule = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
};

describe("user-facing simulator theme", () => {
  it("uses the navy simulator shell and orange active state in learner navigation", () => {
    const css = source("src/components/student/StudentSidebar.module.css");

    expect(rule(css, ".sidebar")).toMatch(/var\(--c-navy-2\)/);
    expect(css).toMatch(/\.active,\s*\.active:hover\s*\{[\s\S]*?color:\s*var\(--c-orange\)/);
    expect(css).toMatch(/\.active::before\s*\{[\s\S]*?background:\s*var\(--c-orange\)/);
  });

  it("reserves a mobile content safe area beneath the fixed learner navigation toggle", () => {
    const css = source("src/components/student/StudentShell.module.css");

    expect(css).toMatch(/@media\s*\(max-width:\s*1023px\)[\s\S]*?\.main\s*\{[\s\S]*?padding-top:\s*72px/);
  });

  it("uses simulator shell chrome in the anonymous catalog header", () => {
    const css = source("src/components/student/PublicCatalogHeader.module.css");

    expect(rule(css, ".bar")).toMatch(/var\(--c-navy-2\)/);
    expect(css).toMatch(/^\.signUp\s*\{[\s\S]*?background:\s*var\(--c-orange\)/m);
  });

  it("gives login and signup cards the white simulator surface and restrained elevation", () => {
    for (const file of [
      "src/app/login/LoginForm.module.css",
      "src/app/signup/signup.module.css",
    ]) {
      const css = source(file);
      expect(rule(css, ".card")).toMatch(/background:\s*var\(--c-card\)/);
      expect(rule(css, ".card")).toMatch(/box-shadow:\s*var\(--sh-2\)/);
    }
  });

  it("uses simulator elevation for learner-facing cards and work surfaces", () => {
    const expectations: Array<[string, string, string]> = [
      ["src/app/certificates/[hash]/page.module.css", ".certCard", "--sh-1"],
      ["src/app/courses/[slug]/page.module.css", ".section", "--sh-1"],
      ["src/app/dashboard/page.module.css", ".card", "--sh-1"],
      ["src/app/pricing/page.module.css", ".card", "--sh-1"],
      ["src/app/profile/page.module.css", ".section", "--sh-1"],
      ["src/app/reset-password/page.module.css", ".page", "--sh-2"],
      ["src/app/tools/page.module.css", ".card", "--sh-1"],
      ["src/app/tools/ad-console/page.module.css", ".frameWrap", "--sh-2"],
      ["src/components/student/CourseAccessNotice.module.css", ".card", "--sh-2"],
    ];

    for (const [file, selector, token] of expectations) {
      const css = source(file);
      expect(css, file).toContain(`box-shadow: var(${token})`);
      expect(css, `${file} must declare ${selector}`).toContain(selector);
    }
  });

  it("retains elevated hover affordance for interactive learner cards", () => {
    for (const file of [
      "src/app/certificates/[hash]/page.module.css",
      "src/app/dashboard/page.module.css",
      "src/app/tools/page.module.css",
    ]) {
      expect(source(file), file).toContain("box-shadow: var(--sh-2)");
    }
  });
});
