import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

type InteractionSite = {
  cssPath: string;
  selector: string;
  hoverSelector: string | null;
};

const SITES: readonly InteractionSite[] = [
  { cssPath: "src/components/ui/Button.module.css", selector: ".btn", hoverSelector: null },
  { cssPath: "src/app/dashboard/page.module.css", selector: ".continueBtn", hoverSelector: ".continueBtn:hover" },
  { cssPath: "src/app/courses/[slug]/page.module.css", selector: ".quizCta", hoverSelector: ".quizCta:hover" },
  { cssPath: "src/app/courses/[slug]/lessons/LessonContent.module.css", selector: ".quizCta", hoverSelector: ".quizCta:hover" },
  { cssPath: "src/app/profile/page.module.css", selector: ".btnPrimary", hoverSelector: ".btnPrimary:hover" },
  { cssPath: "src/app/checkout/checkout-status.module.css", selector: ".btnPrimary", hoverSelector: ".btnPrimary:hover" },
  { cssPath: "src/components/student/CourseAccessNotice.module.css", selector: ".primary", hoverSelector: ".primary:hover" },
];

function readCss(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

function ruleBody(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return source.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
}

describe("simulator button interaction contract", () => {
  it("gives the shared button a simulator focus shadow and transitions that support it", () => {
    const css = readCss("src/components/ui/Button.module.css");

    expect(ruleBody(css, ".btn")).toMatch(/transition:[\s\S]*?box-shadow\s+var\(--transition\)/);
    expect(ruleBody(css, ".btn:focus-visible")).toMatch(/box-shadow:\s*var\(--sh-focus\)/);
    expect(ruleBody(css, ".primary")).toMatch(/background:\s*var\(--c-orange\)/);
  });

  for (const site of SITES) {
    describe(`${site.cssPath} ${site.selector}`, () => {
      it("does not retain a no-shadow hover freeze", () => {
        const css = readCss(site.cssPath);
        const body = site.hoverSelector ? ruleBody(css, site.hoverSelector) : css;
        expect(body).not.toMatch(/box-shadow\s*:\s*none\s*;/);
      });
    });
  }

  it("keeps elevated primary actions on the user-facing surfaces that use hover elevation", () => {
    const profile = readCss("src/app/profile/page.module.css");
    const courseAccess = readCss("src/components/student/CourseAccessNotice.module.css");

    expect(ruleBody(profile, ".btnPrimary:hover")).toMatch(/box-shadow:\s*var\(--sh-2\)/);
    expect(ruleBody(courseAccess, ".primary:hover")).toMatch(/box-shadow:\s*var\(--sh-1\)/);
  });
});
