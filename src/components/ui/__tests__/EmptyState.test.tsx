/**
 * EmptyState — renders the title as a heading element so screen-reader
 * heading navigation works inside the empty state. The default heading
 * level is h3; callers can override to h2 or h4 to match the surrounding
 * document outline.
 */

import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "@/components/ui/EmptyState";

describe("EmptyState", () => {
  it("renders the title as an h3 by default", () => {
    const html = renderToString(<EmptyState title="Nothing here yet" />);
    expect(html).toContain("<h3");
    expect(html).toContain("Nothing here yet");
  });

  it("renders the title as an h2 when headingLevel is h2", () => {
    const html = renderToString(<EmptyState headingLevel="h2" title="Quiz not found" />);
    expect(html).toContain("<h2");
    expect(html).toContain("Quiz not found");
  });

  it("renders the title as an h4 when headingLevel is h4", () => {
    const html = renderToString(<EmptyState headingLevel="h4" title="Empty bucket" />);
    expect(html).toContain("<h4");
    expect(html).toContain("Empty bucket");
  });
});
