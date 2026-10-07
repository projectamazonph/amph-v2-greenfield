// @vitest-environment node

/**
 * LessonNavButtons layout contract — pin the sticky footer band markup.
 *
 * Story STORY-158 ships a sticky-positioned Previous / Next footer band
 * inside the lesson reading surface. The band carries an optional
 * centered module-position label. These contracts guard the band against
 * regression when the component is refactored (CSS module hash is unstable
 * by design, so we assert on the raw source).
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const LESSON_NAV_CSS = resolve(
  process.cwd(),
  "src/app/courses/[slug]/lessons/LessonNavButtons.module.css",
);

const source = readFileSync(LESSON_NAV_CSS, "utf8");

describe("LessonNavButtons sticky footer band layout", () => {
  it("pins the footer band to the bottom of the scrolling area", () => {
    expect(source).toMatch(/\.row\s*\{[^}]*position:\s*sticky;/);
    expect(source).toMatch(/\.row\s*\{[^}]*bottom:\s*0;/);
  });

  it("gives the band a non-zero z-index so it stacks above reading content", () => {
    expect(source).toMatch(/\.row\s*\{[^}]*z-index:\s*\d+;/);
  });

  it("uses a three-column grid that hosts both action buttons and the centered label", () => {
    expect(source).toMatch(/\.row\s*\{[^}]*display:\s*grid;/);
    expect(source).toMatch(/grid-template-columns:\s*1fr\s+auto\s+1fr;/);
  });

  it("drops sticky on narrow screens so the band never eats the viewport", () => {
    expect(source).toMatch(
      /@media\s*\(max-width:\s*640px\)\s*\{[^}]*\.row\s*\{[^}]*position:\s*static;/,
    );
  });

  it("honors prefers-reduced-motion by clearing transitions", () => {
    expect(source).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  });

  it("exposes a focus-visible style on the action buttons", () => {
    expect(source).toMatch(/\.actionButton:focus-visible\s*\{/);
  });

  it("ships only design-token values inside the band (no raw hex, no px spacing)", () => {
    const bandBlock = source.match(/\.row\s*\{[\s\S]*?\n\}/);
    expect(bandBlock).not.toBeNull();
    const block = bandBlock![0];
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    // No raw pixel spacings like `8px` or `12px` inside the band block;
    // tokens-only CSS guards against that. Box-shadow token shorthand is
    // allowed because it lives inside a var() reference.
    expect(block).not.toMatch(/^\s*(padding|margin|gap):\s*\d+px;/m);
  });
});
