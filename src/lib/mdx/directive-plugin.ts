// src/lib/mdx/directive-plugin.ts
/**
 * directivePlugin — hand-rolled remark plugin for `:::name{...}` fences.
 *
 * Why hand-rolled: `remark-directive` is not in `pnpm-lock.yaml`, and the spec
 * forbids adding a new dependency. The plugin supports three blocks:
 *   :::trade-off{id="..." title="..."}body-as-markdown-table:::
 *   :::process{id="..." title="..." steps="A|B|C" hint="..."}body:::
 *   :::callout{variant="info|warning|pitfall" title="..."}body:::
 *   :::visual{id="..." kind="..." title="..."}json-body:::
 *   :::comparison-table{id="..." title="..."}json-body:::
 *   :::formula-ladder{id="..." title="..."}json-body:::
 *   :::classification-board{id="..." title="..."}json-body:::
 *   :::decision-flow{id="..." title="..."}json-body:::
 *   :::simulation-rubric{id="..." title="..."}json-body:::
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

import { visit, SKIP } from "unist-util-visit";
import type { Root, Html, Paragraph, Table, TableRow, TableCell, Text, RootContent } from "mdast";

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
    rows.push({ label: cells[0] ?? "", value: cells.slice(1).join(", ") });
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

function tableCellsToRow(row: TableRow): TradeOffRow | null {
  const cells = row.children.filter((c): c is TableCell => c.type === "tableCell");
  if (cells.length < 2) return null;
  const cellTexts = cells.map((cell) => {
    const textNode = cell.children[0];
    return textNode?.type === "text" ? textNode.value.trim() : "";
  });
  // Skip the markdown separator row (e.g. | --- | --- |).
  if (cellTexts.every((t) => /^[-:\s]+$/.test(t))) return null;
  // Skip the stray closing-fence row (GFM may parse `:::` as a 1-cell row).
  if (cellTexts.length === 1 && cellTexts[0] === ":::") return null;
  return { label: cellTexts[0] ?? "", value: cellTexts.slice(1).join(", ") };
}

function tableToRows(table: Table): TradeOffRow[] {
  const rows: TradeOffRow[] = [];
  for (const row of table.children) {
    if (row.type !== "tableRow") continue;
    const parsed = tableCellsToRow(row);
    if (parsed) rows.push(parsed);
  }
  return rows;
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

      // Case A: directive occupies a single paragraph (no GFM table inside).
      let closeIdx = -1;
      for (let i = lines.length - 1; i > 0; i--) {
        const line = lines[i] ?? "";
        if (FENCE_CLOSE.test(line)) {
          closeIdx = i;
          break;
        }
      }
      let inner: string;
      let replacement: Html;
      if (closeIdx !== -1) {
        inner = lines.slice(1, closeIdx).join("\n");
        const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
        const attrsSerialized = attrsToData(attrs);
        const value = buildDirectiveHtml(name, attrs, attrsSerialized, inner);
        replacement = { type: "html", value } as unknown as Html;
        (parent.children as unknown[])[index] = replacement;
        return;
      }

      // Case B: directive opens a paragraph but the body was parsed by GFM
      // into a separate block (e.g. a `table` for trade-off). Look at the
      // next sibling; if it's the expected kind, fold it into the directive.
      const nextSibling = parent.children[index + 1] as RootContent | undefined;
      if (!nextSibling) return;
      const attrs = parseDirectiveAttrs(openMatch[2] ?? "");
      const attrsSerialized = attrsToData(attrs);

      if (name === "trade-off" && nextSibling.type === "table") {
        const rows = tableToRows(nextSibling as Table);
        const dataAttr = `data-amph-rows='${JSON.stringify(rows).replace(/'/g, "&#39;")}'`;
        const value = `<div data-amph-block="${name}" ${attrsSerialized} ${dataAttr}></div>`;
        replacement = { type: "html", value } as unknown as Html;
        (parent.children as unknown[])[index] = replacement;
        // Splice out the GFM-split sibling table instead of leaving a duplicate
        // html node reference at index+1.
        (parent.children as unknown[]).splice(index + 1, 1);
        return [SKIP, index + 1] as unknown as ReturnType<typeof visit>;
      }

      // Other directives (process, callout) need their body inline; if GFM
      // split them, we can't reconstruct — leave the paragraph alone.
    });
  };
}

const JSON_LESSON_DIRECTIVES = new Set([
  "visual",
  "slide",
  "comparison-table",
  "formula-ladder",
  "classification-board",
  "decision-flow",
  "simulation-rubric",
  "annotated-listing",
  "hierarchy-builder",
  "funnel-canvas",
  "timeline-calendar",
  "competitive-gap-matrix",
  "insight-router",
  "lesson-pathway",
  "simulation-brief",
  "portfolio-map",
  "seasonal-calendar",
  "evidence-ledger",
  "sov-positioner",
]);

function buildDirectiveHtml(
  name: string,
  attrs: Record<string, string>,
  attrsSerialized: string,
  inner: string,
): string {
  if (JSON_LESSON_DIRECTIVES.has(name)) {
    const bodyAttr = `data-amph-body="${encodeURIComponent(inner)}"`;
    return `<div data-amph-block="${name}" ${attrsSerialized} ${bodyAttr}></div>`;
  }
  if (name === "trade-off") {
    // Inner body is a markdown table. Parse it and serialize as JSON.
    const tableLines = inner.split(/\n/).filter((l) => l.trim().startsWith("|"));
    const rows = parseMarkdownTableRows(tableLines);
    const dataAttr = `data-amph-rows='${JSON.stringify(rows).replace(/'/g, "&#39;")}'`;
    return `<div data-amph-block="${name}" ${attrsSerialized} ${dataAttr}></div>`;
  }
  // For process and callout, the inner body is just text. Pass through as
  // an inner div so the renderer can read it from children.
  const innerEscaped = inner
    ? inner.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    : "";
  return innerEscaped
    ? `<div data-amph-block="${name}" ${attrsSerialized}><div>${innerEscaped}</div></div>`
    : `<div data-amph-block="${name}" ${attrsSerialized}></div>`;
}
