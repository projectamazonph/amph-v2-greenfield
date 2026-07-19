/**
 * Landing page — wire-up test.
 * The src/app/page.tsx should render all 8 sections in order.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import HomePage from "../../../app/page";

describe("Landing page", () => {
  it("renders all 8 section H1+H2 headings in order", () => {
    const html = renderToString(createElement(HomePage));
    const headlines = [
      "The Amazon ads training built for Filipino VAs", // Hero
      "What the training gets you", // Numbers
      "Who this is for", // Audience
      "just watch lessons", // Simulators
      "Course structure", // Curriculum
      "Three tiers, one-time payment", // Pricing
      "Common questions", // FAQ
      "Pick your tier. Start tonight.", // FinalCTA
    ];
    let lastIndex = -1;
    for (const headline of headlines) {
      const idx = html.indexOf(headline);
      expect(idx, `headline missing: ${headline}`).toBeGreaterThan(-1);
      expect(idx, `out of order: ${headline}`).toBeGreaterThan(lastIndex);
      lastIndex = idx;
    }
  });

  it("does not contain any banned marketing phrases (sample check)", () => {
    const html = renderToString(createElement(HomePage));
    const banned = [
      "delve",
      "leverage",
      "seamless",
      "cutting-edge",
      "revolutionary",
      "game-changing",
      "next-generation",
      "world-class",
      "elevate your",
      "supercharge",
      "turbocharge",
      "in order to",
      "at the end of the day",
      "when it comes to",
      "a wide range of",
      "a variety of",
      "in today's fast-paced world",
      "unlock the power of",
      "harness the potential of",
      "best-in-class",
    ];
    const lower = html.toLowerCase();
    for (const phrase of banned) {
      expect(lower, `banned phrase present: "${phrase}"`).not.toContain(phrase);
    }
  });

  it("contains a single H1 (the Hero headline)", () => {
    const html = renderToString(createElement(HomePage));
    const h1s = html.match(/<h1[\s>]/g) ?? [];
    expect(h1s.length).toBe(1);
  });
});
