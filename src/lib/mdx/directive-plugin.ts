// src/lib/mdx/directive-plugin.ts
/**
 * directivePlugin — hand-rolled remark plugin for `:::name{...}` fences.
 *
 * Why hand-rolled: `remark-directive` is not in `pnpm-lock.yaml`, and the spec
 * forbids adding a new dependency. The plugin supports three blocks:
 *   :::trade-off{id="..." title="..."}body-as-markdown-table:::
 *   :::process{id="..." title="..." steps="A|B|C" hint="..."}body:::
 *   :::callout{variant="info|warning|pitfall" title="..."}body:::
 *
 * For `trade-off`, the inner body is a markdown table (per spec Section 5.1).
 * We parse the table rows into JSON and serialize them into `data-amph-rows`.
 * The renderer reads `data-amph-rows` and parses the JSON.
 *
 * Scope: a directive must occupy an entire paragraph. The inner text node is
 * split on \n; line 0 is the opening fence, last matching `:::` line is the
 * close, and everything between is the body.
 *
 * Output: the directive paragraph is replaced with an `html` node whose
 * value is `<div data-amph-block="..." data-amph-id="..." ...></div>`.
 */

import { visit } from "unist-util-visit";
import type { Root, Html, Paragraph, Text } from "mdast";

const FENCE_OPEN = /^:::([a-z-]+)(?:\{([^}]*)\})?\s*$/;
const FENCE_CLOSE = /^:::\s*$/;

export function parseDirectiveAttrs(s: string): Record<string, string> {
  if (!s) return {};
  const result: Record<string, string> = {};
  const re = /([a-zA-Z][\w-]*)=("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\s,]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) !== null) {
    let value: string = m[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    const key: string = m[1] ?? "";
    if (key) result[key] = value;
  }
  return result;
}

interface TradeOffRow {
  label: string;
  value: string;
}

function parseMarkdownTableRows(lines: string[]): TradeOffRow[] {
  // Each line looks like "| cell | cell |". Split, trim, drop empties.
  const rows: TradeOffRow[] = [];
  for (const raw of lines) {
    const cells = raw
      .split("|")
      .map((c) => c.trim())
      .filter((c) => c.length > 0);
    if (cells.length < 2) continue;
    // Skip the markdown separator row (e.g. | --- | --- |).
    if (cells.every((c) => /^[-:\s]+$/.test(c))) continue;
    rows.push({ label: cells[0] ?? "", value: cells.slice(1).join(" — ") });
  }
  return rows;
}

function attrsToData(attrs: Record<string, string>): string {
  return Object.entries(attrs)
    .map(
      ([k, v]) =>
        `data-amph-${k}="${String(v).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}"`,
    )
    .join(" ");
}

export function directivePlugin() {
  return (tree: Root) => {
    visit(tree, "paragraph", (node: Paragraph, index, parent) => {
      if (!parent || index === undefined) return;
      if (node.children.length !== 1) return;
      const child = node.children[0];
      if (!child || child.type !== "text") return;
      const lines = (child as Text).value.split(/\n/);
      const openMatch = lines[0] ? lines[0].match(FENCE_OPEN) : null;
      if (!openMatch) return;
      const name: string = openMatch[1] ?? "";
      const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
      let closeIdx = -1;
      for (let i = lines.length - 1; i > 0; i--) {
        const line = lines[i] ?? "";
        if (FENCE_CLOSE.test(line)) {
          closeIdx = i;
          break;
        }
      }
      if (closeIdx === -1) return;
      const inner = lines.slice(1, closeIdx).join("\n");
      const attrsSerialized = attrsToData(attrs);

      let value: string;
      if (name === "trade-off") {
        // Inner body is a markdown table. Parse it and serialize as JSON.
        const tableLines = inner.split(/\n/).filter((l) => l.trim().startsWith("|"));
        const rows = parseMarkdownTableRows(tableLines);
        const dataAttr = `data-amph-rows='${JSON.stringify(rows).replace(/'/g, "&#39;")}'`;
        value = `<div data-amph-block="${name}" ${attrsSerialized} ${dataAttr}></div>`;
      } else {
        // For process and callout, the inner body is just text. Pass through
        // as an inner div so the renderer can read it from children, but the
        // renderer reads attributes directly so we can leave the inner empty.
        const innerEscaped = inner
          ? inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          : "";
        value = innerEscaped
          ? `<div data-amph-block="${name}" ${attrsSerialized}><div>${innerEscaped}</div></div>`
          : `<div data-amph-block="${name}" ${attrsSerialized}></div>`;
      }

      const replacement: Html = {
        type: "html",
        value,
      } as unknown as Html;
      (parent.children as unknown[])[index] = replacement;
    });
  };
}
