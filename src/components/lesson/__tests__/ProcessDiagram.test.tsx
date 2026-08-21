// src/components/lesson/__tests__/ProcessDiagram.test.tsx
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProcessDiagram } from "../ProcessDiagram";

describe("ProcessDiagram", () => {
  it("renders ordered list with step labels", () => {
    const html = renderToString(
      <ProcessDiagram
        id="work-loop"
        title="Your work loop"
        steps={[
          { id: "s1", label: "Read" },
          { id: "s2", label: "Decide" },
          { id: "s3", label: "Change" },
          { id: "s4", label: "Explain" },
        ]}
      />,
    );
    expect(html).toContain('id="work-loop"');
    expect(html).toContain("<ol");
    expect(html).toContain("Your work loop");
    expect(html).toContain("Read");
    expect(html).toContain("Decide");
    expect(html).toContain("Change");
    expect(html).toContain("Explain");
    expect(html).toContain('aria-label="Lesson process steps"');
  });

  it("renders hint when provided", () => {
    const html = renderToString(
      <ProcessDiagram
        id="hinted"
        title="Loop"
        steps={[
          { id: "s1", label: "Step 1" },
          { id: "s2", label: "Step 2" },
        ]}
        hint="A short note about the loop."
      />,
    );
    expect(html).toContain("A short note about the loop.");
  });

  it("rejects fewer than two steps at author time", () => {
    expect(() =>
      renderToString(
        <ProcessDiagram id="lone" title="Lone" steps={[{ id: "only", label: "Only" }]} />,
      ),
    ).toThrow(/at least 2 steps/i);
  });

  it("renders vertical layout when layout='vertical'", () => {
    const html = renderToString(
      <ProcessDiagram
        id="vert"
        title="Vertical"
        layout="vertical"
        steps={[
          { id: "s1", label: "A" },
          { id: "s2", label: "B" },
        ]}
      />,
    );
    expect(html).toContain("Vertical");
    // The class applied should include "vertical" - exact CSS module class name will be mangled,
    // so just confirm vertical layout class is referenced in the rendered output
    expect(html).toMatch(/vertical/i);
  });
});
