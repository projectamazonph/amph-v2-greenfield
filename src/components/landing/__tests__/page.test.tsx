/* eslint-disable no-restricted-syntax */
/**
 * Landing page — wire-up test.
 * src/app/page.tsx should render the section headings in order.
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import HomePage from "../../../app/page";

describe("Landing page", () => {
  it("renders the section headings in order", () => {
    const html = renderToString(createElement(HomePage));
    const headlines = [
      "Learn PPC by", // Hero
      "just watch lessons", // Method
      "Move a bid. Watch the account breathe.", // SimulatorSection
      "Eight modules, in order. No surprises.", // Curriculum
      "A paid course. We think it should be.", // WhoFor
      "Three tiers, one-time payment.", // Pricing
      "Direct, grounded in real account work.", // Mentor
      "A certificate that opens doors, not one that sits idle.", // Proof
      "Plain answers.", // FAQSection
      "Stop watching.", // DarkCTA
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

  it("does not claim the in-course simulators are available now or ready to use", () => {
    // Tripwire: only 4 of 5 simulators exist and the in-course student UI
    // is still in development (see CLAUDE.md "Known gaps"). The Bid
    // Elevator widget on this page is an unauthenticated public preview,
    // not the real scored simulator — copy must stay honest about that.
    const html = renderToString(createElement(HomePage)).toLowerCase();
    expect(html).not.toMatch(/simulators? (are|is) (available|ready|live|finished|complete)/);
    expect(html).not.toContain("try the simulator");
    expect(html).not.toContain("practice now");
  });
});
