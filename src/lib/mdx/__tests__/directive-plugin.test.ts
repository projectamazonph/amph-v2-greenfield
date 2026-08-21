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
