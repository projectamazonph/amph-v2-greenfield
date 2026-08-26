import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { StatsStrip } from "../StatsStrip";

describe("StatsStrip truthful initial state", () => {
  it("renders reviewed programme values before client animation starts", () => {
    const html = renderToString(createElement(StatsStrip));

    expect(html).toContain(">12</span>");
    expect(html).toContain(">5</span>");
    expect(html).toContain(">443</span>");
    expect(html).toContain(">2,500</span>");
    expect(html).not.toContain(">0</span>");
  });

  it("keeps the programme summary in the server HTML for no-JavaScript and screen readers", () => {
    const html = renderToString(createElement(StatsStrip));

    expect(html).toContain('aria-label="Program at a glance"');
    expect(html).toContain("Modules");
    expect(html).toContain("Practice tools");
    expect(html).toContain("Planned lessons");
    expect(html).toContain("Source estimate; practice adds time");
  });
});
