import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(process.cwd(), "src");

const source = (relativePath: string): string =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

const rule = (css: string, selector: string): string => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`, "m"))?.[1] ?? "";
};

const productionStyleAndComponentFiles = (directory: string): string[] =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) return productionStyleAndComponentFiles(path);
    if (entry.name.includes(".test.")) return [];
    return entry.name.endsWith(".css") || entry.name.endsWith(".tsx") ? [path] : [];
  });

describe("simulator theme completion", () => {
  it("keeps retired Field Manual and Waybill language out of production UI source", () => {
    const retiredTerms = /Field Manual|field-manual|Waybill Orange|Waybill|Space Grotesk/;

    for (const file of productionStyleAndComponentFiles(root)) {
      expect(readFileSync(file, "utf8"), relative(root, file)).not.toMatch(retiredTerms);
    }
  });

  it("uses the simulator ambient layer instead of paper texture, noise, and registration marks", () => {
    const component = source("src/components/landing/PageTexture.tsx");
    const css = source("src/components/landing/PageTexture.module.css");

    expect(component).toMatch(/styles\.ambient/);
    expect(component).not.toMatch(/RegisterMark|styles\.grid|styles\.noise/);
    expect(css).toMatch(/\.utilityLine/);
    expect(css).not.toMatch(/fractalNoise|mask-image|@keyframes/);
  });

  it("uses a simulator mentor credential instead of a rotated field-note stamp", () => {
    const component = source("src/components/landing/Mentor.tsx");
    const css = source("src/components/landing/Mentor.module.css");

    expect(component).toMatch(/styles\.credential/);
    expect(component).not.toMatch(/styles\.stamp|Field notes, not slides/);
    expect(rule(css, ".credential")).toMatch(/background:\s*var\(--c-navy-2\)/);
    expect(css).not.toMatch(/rotate\(|3px 3px 0/);
  });

  it("uses simulator elevation and accessible authoring controls in the quiz editor", () => {
    const css = source("src/components/admin/QuizEditor.module.css");

    expect(rule(css, ".questionCard")).toMatch(/box-shadow:\s*var\(--sh-1\)/);
    expect(rule(css, ".addQuestionButton")).toMatch(/background:\s*var\(--c-orange\)/);
    expect(rule(css, ".iconButton")).toMatch(/min-height:\s*40px/);
    expect(css).toMatch(/@media\s*\(max-width:\s*640px\)[\s\S]*?\.addQuestionButton\s*\{[\s\S]*?min-height:\s*44px/);
  });

  it("keeps the final lesson and sidebar exceptions token-based", () => {
    const tranche = source("src/components/lesson/TrancheOneVisuals.module.css");
    const userCard = source("src/components/admin/UserCard.module.css");

    expect(tranche).not.toMatch(/rgba\(30, 64, 175/);
    expect(rule(userCard, ".logoutButton:hover")).toMatch(/var\(--c-red/);
    expect(userCard).not.toMatch(/#ffb3a8/);
  });
});
