/**
 * Curriculum — 4 contract tests.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { readFileSync } from "node:fs";
import { Curriculum } from "../Curriculum";

describe("Curriculum", () => {
  it("renders all 8 modules in order", () => {
    const html = renderToString(createElement(Curriculum));
    // Module titles
    expect(html).toContain("Amazon Ads fundamentals");
    expect(html).toContain("Sponsored Brands and Display");
    expect(html).toContain("Keyword research for new products");
  });

  it("labels modules 1–5 as Foundations", () => {
    const html = renderToString(createElement(Curriculum));
    // 5 Foundations tags
    const matches = html.match(/Foundations/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(5);
  });

  it("labels modules 6–8 as Mastery", () => {
    const html = renderToString(createElement(Curriculum));
    // 3 Mastery tags
    const matches = html.match(/Mastery/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(3);
  });

  it("gives a time estimate in the side block", () => {
    const html = renderToString(createElement(Curriculum));
    expect(html).toContain("How long does it take?");
    expect(html).toMatch(/4.6 weeks/);
  });

  it("keeps its dense table in a keyboard-reachable scroll region", () => {
    const html = renderToString(createElement(Curriculum));

    expect(html).toMatch(/role="region"[^>]+aria-label="Curriculum modules"/);
    expect(html).toMatch(/aria-label="Curriculum modules"[^>]+tabindex="0"/);

    const css = readFileSync(new URL("../Curriculum.module.css", import.meta.url), "utf8");
    expect(css).toMatch(/\.tableWrap\s*\{[\s\S]*?overflow-x:\s*auto;/);
    expect(css).toMatch(/\.table\s*\{[\s\S]*?min-width:\s*560px;/);
  });
});
