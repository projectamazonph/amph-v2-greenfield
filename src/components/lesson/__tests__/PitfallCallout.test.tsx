// src/components/lesson/__tests__/PitfallCallout.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PitfallCallout } from "../PitfallCallout";

describe("PitfallCallout", () => {
  it("renders info variant with title and body", () => {
    const html = renderToString(
      <PitfallCallout id="note-1" variant="info" title="Note">
        <p>Body copy here.</p>
      </PitfallCallout>,
    );
    expect(html).toContain('role="note"');
    expect(html).toContain("Note");
    expect(html).toContain("Body copy here.");
    expect(html).toMatch(/aria-hidden="true"/);
  });

  it("accepts warning and pitfall variants without crash", () => {
    for (const variant of ["warning", "pitfall"] as const) {
      const html = renderToString(
        <PitfallCallout id={`x-${variant}`} variant={variant}>
          <p>Watch out.</p>
        </PitfallCallout>,
      );
      expect(html).toContain('role="note"');
      expect(html).toContain("Watch out.");
    }
  });

  it("renders title as an h3", () => {
    const html = renderToString(
      <PitfallCallout id="titled" variant="pitfall" title="Don't do this">
        <p>Because.</p>
      </PitfallCallout>,
    );
    // React 19's renderToString escapes apostrophes to &#x27;, so the regex
    // matches either form. The contract is "title content lands in an <h3>",
    // not the literal byte sequence.
    expect(html).toMatch(/<h3[^>]*>Don(?:&#x27;|')t do this<\/h3>/);
  });
});
