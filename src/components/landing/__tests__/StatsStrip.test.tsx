import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { createElement } from "react";
import { StatsStrip } from "../StatsStrip";

describe("StatsStrip truthful initial state", () => {
  it("renders reviewed programme values before client animation starts", () => {
    const html = renderToString(createElement(StatsStrip));

    expect(html).toContain(">13</span>");
    // STORY-089 added the 6th simulator (connected-account) so the
    // landing page now advertises 6 practice tools, not 5. This
    // number must match PUBLIC_CURRICULUM_CLAIMS.simulators, which
    // is the source of truth.
    expect(html).toContain(">6</span>");
    expect(html).toContain(">595</span>");
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
