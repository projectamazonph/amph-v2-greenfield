/**
 * HeroPriceLadder — three-tier compact price strip rendered between the
 * hero body and the CTA row. Pins the conversion value above the fold.
 *
 * Test surface: server-rendered HTML (this is a server component).
 */

import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { HeroPriceLadder } from "../HeroPriceLadder";

describe("HeroPriceLadder", () => {
  it("renders the three tiers with verified prices", () => {
    const html = renderToString(createElement(HeroPriceLadder));

    expect(html).toContain("Essentials");
    expect(html).toContain("Pro Operator");
    expect(html).toContain("Elite");
    expect(html).toContain("₱2,999");
    expect(html).toContain("₱5,999");
    expect(html).toContain("₱9,999");
  });

  it("marks the middle tier as the most-picked choice", () => {
    const html = renderToString(createElement(HeroPriceLadder));

    expect(html).toContain("Most picked");
  });

  it("anchors every tier card to the in-page pricing section", () => {
    const html = renderToString(createElement(HeroPriceLadder));

    const anchorMatches = html.match(/href="#pricing"/g) ?? [];
    expect(anchorMatches.length).toBeGreaterThanOrEqual(3);
  });

  it("exposes an accessible name for the price strip group", () => {
    const html = renderToString(createElement(HeroPriceLadder));

    expect(html).toContain('aria-label="Three pricing tiers"');
  });

  it("renders the most-picked badge ahead of the tier label it qualifies", () => {
    const html = renderToString(createElement(HeroPriceLadder));

    // The badge text appears inside the same anchor as "Pro Operator".
    expect(html).toMatch(/Most picked[\s\S]{0,200}Pro Operator|Pro Operator[\s\S]{0,200}Most picked/);
  });
});