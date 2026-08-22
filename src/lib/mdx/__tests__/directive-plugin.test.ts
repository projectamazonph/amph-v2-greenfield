// src/lib/mdx/__tests__/directive-plugin.test.ts
import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { directivePlugin, parseDirectiveAttrs } from "../directive-plugin";

function run(source: string) {
  const tree = unified().use(remarkParse).parse(source);
  unified().use(directivePlugin).runSync(tree);
  return tree;
}

function runWithGfm(source: string) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  unified().use(directivePlugin).runSync(tree);
  return tree;
}

describe("directivePlugin", () => {
  it("parseDirectiveAttrs parses quoted and unquoted values", () => {
    expect(parseDirectiveAttrs('id="x" title="Big Six"')).toEqual({
      id: "x",
      title: "Big Six",
    });
    expect(parseDirectiveAttrs('steps="A|B|C"')).toEqual({ steps: "A|B|C" });
  });

  it("converts :::trade-off paragraph with markdown table to html node", () => {
    const tree = run(
      `:::trade-off{id="big-six" title="The Big Six"}\n| Metric | What it answers |\n| --- | --- |\n| CPC | How much per click |\n| CTR | Share of impressions that become clicks |\n:::`,
    );
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="trade-off"');
    expect(node.value).toContain('data-amph-id="big-six"');
    expect(node.value).toContain('data-amph-title="The Big Six"');
    // rows must be JSON-encoded into data-amph-rows
    expect(node.value).toContain("data-amph-rows=");
    // JSON must contain both label and value of CPC row
    expect(node.value).toMatch(/"label"\s*:\s*"CPC"/);
    expect(node.value).toMatch(/"value"\s*:\s*"How much per click"/);
  });

  it("converts :::visual to html with encoded JSON body", () => {
    const tree = run(
      `:::visual{id="map" kind="diagnostic-map" title="Read the path"}\n{"steps":[{"number":1,"title":"Impression"}]}\n:::`,
    );
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="visual"');
    expect(node.value).toContain('data-amph-id="map"');
    expect(node.value).toContain('data-amph-kind="diagnostic-map"');
    expect(node.value).toContain("data-amph-body=");
    expect(node.value).toContain("%7B%22steps%22");
  });

  it("converts each Tranche 1 JSON directive to an encoded html node", () => {
    const names = ["comparison-table", "formula-ladder", "classification-board", "decision-flow", "simulation-rubric"];
    for (const name of names) {
      const tree = run(`:::${name}{id="x-${name}" title="Test"}\n{"steps":[{"label":"A"},{"label":"B"}]}\n:::`);
      const node = tree.children[0] as { type: string; value: string };
      expect(node.type).toBe("html");
      expect(node.value).toContain(`data-amph-block="${name}"`);
      expect(node.value).toContain("data-amph-body=");
      expect(node.value).toContain("%7B%22steps%22");
    }
  });

  it("converts each Tranche 2 JSON directive to an encoded html node", () => {
    const names = ["annotated-listing", "hierarchy-builder", "funnel-canvas", "timeline-calendar"];
    for (const name of names) {
      const tree = run(`:::${name}{id="x-${name}" title="Test"}\n{"root":{"label":"Account"},"stages":[{"id":"a"},{"id":"b"}],"periods":["A","B"]}\n:::`);
      const node = tree.children[0] as { type: string; value: string };
      expect(node.type).toBe("html");
      expect(node.value).toContain(`data-amph-block="${name}"`);
      expect(node.value).toContain("data-amph-body=");
      expect(node.value).toContain("%7B%22root%22");
    }
  });

  it("preserves reveal-mode metadata on learner-first directives", () => {
    const tree = run(`:::decision-flow{id="flow" title="Flow" reveal-mode="after-choice"}\n{"steps":[{"id":"a","label":"A","question":"Q","evidence":"E","action":"X"}]}\n:::`);
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-reveal-mode="after-choice"');
  });

  it("converts next-tranche directives to encoded html nodes", () => {
    const names = ["lesson-pathway", "simulation-brief", "portfolio-map", "seasonal-calendar", "evidence-ledger", "sov-positioner"];
    for (const name of names) {
      const tree = run(`:::${name}{id="x-${name}" title="Test"}\n{"steps":[{"id":"a"},{"id":"b"}],"fields":[{"id":"a"},{"id":"b"}],"groups":[{"id":"a"},{"id":"b"}],"phases":[{"id":"a"},{"id":"b"}],"entries":[{"id":"a"},{"id":"b"}],"bands":[{"id":"a"},{"id":"b"}]}\n:::`);
      const node = tree.children[0] as { type: string; value: string };
      expect(node.type).toBe("html");
      expect(node.value).toContain(`data-amph-block="${name}"`);
      expect(node.value).toContain("data-amph-body=");
    }
  });

  it("converts competitive intelligence directives to encoded html nodes", () => {
    const cases = [
      ["competitive-gap-matrix", "dimensions"],
      ["insight-router", "routes"],
    ] as const;
    for (const [name, key] of cases) {
      const tree = run(`:::${name}{id="x-${name}" title="Test"}\n{"${key}":[{"id":"a"},{"id":"b"}]}\n:::`);
      const node = tree.children[0] as { type: string; value: string };
      expect(node.type).toBe("html");
      expect(node.value).toContain(`data-amph-block="${name}"`);
      expect(node.value).toContain("data-amph-body=");
    }
  });

  it("converts :::process to html node", () => {
    const tree = run(
      `:::process{id="loop" title="Your work loop" steps="Read|Decide|Change|Explain"}\n:::`,
    );
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="process"');
    expect(node.value).toContain('data-amph-steps="Read|Decide|Change|Explain"');
  });

  it("converts :::callout to html node", () => {
    const tree = run(`:::callout{variant="info" title="Note"}\nWatch this: prices will move.\n:::`);
    const node = tree.children[0] as { type: string; value: string };
    expect(node.type).toBe("html");
    expect(node.value).toContain('data-amph-block="callout"');
    expect(node.value).toContain('data-amph-variant="info"');
    expect(node.value).toContain('data-amph-title="Note"');
  });

  it("leaves regular paragraphs alone", () => {
    const tree = run(`A plain paragraph with no directive.`);
    const node = tree.children[0] as { type: string };
    expect(node.type).toBe("paragraph");
  });

  it("preserves leading paragraphs before a directive", () => {
    const tree = run(
      `Intro text.\n\n:::trade-off{id="x" title="T"}\n| A | B |\n| --- | --- |\n| 1 | 2 |\n:::`,
    );
    expect(tree.children).toHaveLength(2);
    expect((tree.children[0] as { type: string }).type).toBe("paragraph");
    expect((tree.children[1] as { type: string }).type).toBe("html");
  });
});

describe("directivePlugin (with remark-gfm)", () => {
  it("folds GFM-split table into :::trade-off html (Case B)", () => {
    const tree = runWithGfm(
      `:::trade-off{id="big-six" title="T"}\n| M | V |\n| - | - |\n| CPC | How much |\n| CTR | Click |\n:::`,
    );
    const types = tree.children.map((c: { type: string }) => c.type);
    // Only one html node should remain; the GFM-split table sibling should be folded in or removed.
    expect(types.filter((t) => t === "html")).toHaveLength(1);
    expect(types).not.toContain("table");
    const htmlNode = tree.children[0] as { value: string };
    expect(htmlNode.value).toContain("data-amph-rows=");
    expect(htmlNode.value).toMatch(/"label"\s*:\s*"CPC"/);
  });
});
