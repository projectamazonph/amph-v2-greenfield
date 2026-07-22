/**
 * NextMdxRenderer adapter test, STORY-012.
 *
 * Tests the production MDX adapter end-to-end. The adapter uses
 * `next-mdx-remote/rsc` (server-only) and `gray-matter` for
 * frontmatter. The vitest environment is `node` (see vitest.config.ts),
 * so `server-only` is a no-op and `next-mdx-remote/rsc`'s RSC
 * pipeline runs as plain server-rendered React.
 *
 * The adapter deliberately does NOT import `react-dom/server` so it
 * can be bundled into any code path (middleware, route handlers,
 * etc.) without Turbopack rejecting the build. Tests that need a
 * static HTML snapshot call `react-dom/server`'s `renderToString`
 * on the returned `Component` themselves.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// `server-only` is a marker package that throws at import time in
// client contexts. In vitest (Node), the package's `index.js` is the
// throwing version and `empty.js` (the server-friendly version) is
// only used under the `react-server` condition that vitest's default
// resolution doesn't apply. Same workaround as src/lib/__tests__/*:
// mock the module to an empty object so the import is a no-op.
vi.mock("server-only", () => ({}));

import { renderToString } from "react-dom/server";
import { NextMdxRenderer } from "@/infra/rendering/NextMdxRenderer";

/** A standard AMPH lesson fixture, mirroring the frontmatter shape of AMPH lesson files. */
const SAMPLE_MDX = `---
title: "Welcome. Your Path to Amazon PPC Work"
slug: "0.1-welcome"
moduleNumber: 0
lessonNumber: 1
type: "reading"
estimatedMinutes: 8
xpReward: 50
---

# Welcome. Your Path to Amazon PPC Work

## What you can do after this lesson

Explain what an Amazon PPC virtual assistant does, name the three courses ahead of you, and describe the work loop you'll use in every lesson and tool.

## The job in one sentence

An Amazon PPC VA reads account data, makes a defensible advertising decision, makes the approved change, and explains it in plain English.
`;

describe("NextMdxRenderer", () => {
  let renderer: NextMdxRenderer;

  beforeEach(() => {
    renderer = new NextMdxRenderer();
  });

  // ── Happy path ────────────────────────────────────────────

  it("compiles a plain MDX string with frontmatter and returns frontmatter + Component", async () => {
    const result = await renderer.render(SAMPLE_MDX);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.frontmatter.title).toBe("Welcome. Your Path to Amazon PPC Work");
    expect(result.value.frontmatter.slug).toBe("0.1-welcome");
    expect(result.value.frontmatter.moduleNumber).toBe(0);
    expect(result.value.frontmatter.lessonNumber).toBe(1);
    expect(result.value.frontmatter.type).toBe("reading");
    expect(result.value.frontmatter.estimatedMinutes).toBe(8);
    expect(result.value.frontmatter.xpReward).toBe(50);

    // `Component` is a React element (object), not a function.
    // The port keeps it `unknown` to stay React-free; the adapter
    // stores the pre-compiled element from `next-mdx-remote/rsc`.
    // Verify it renders by passing it through React's server
    // renderer — this is the pattern the lesson page will use.
    expect(result.value.Component).toBeTruthy();
    expect(typeof result.value.Component).toBe("object");
    const treeHtml = renderToString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.value.Component as any,
    );
    expect(treeHtml).toContain("Amazon PPC VA");
  });

  it("compiles MDX without frontmatter (frontmatter is empty object)", async () => {
    const mdx = "# Just a heading\n\nA paragraph.\n";
    const result = await renderer.render(mdx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.frontmatter).toEqual({});
  });

  it("preserves unknown frontmatter fields in the parsed object", async () => {
    const mdx = `---
title: "Sample"
customField: "hello"
nested:
  foo: "bar"
---

Body here.
`;
    const result = await renderer.render(mdx);
    if (!result.ok) {
      throw new Error(`expected ok, got: ${JSON.stringify(result.error)}`);
    }
    expect(result.value.frontmatter.customField).toBe("hello");
    expect(result.value.frontmatter.nested).toEqual({ foo: "bar" });
  });

  it("compiles MDX with inline JSX components", async () => {
    const mdx = "# Title\n\nA <strong>bold</strong> word.\n";
    const result = await renderer.render(mdx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const html = renderToString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.value.Component as any,
    );
    expect(html).toMatch(/<strong>bold<\/strong>/);
  });

  it("compiles MDX with a block-level JSX element", async () => {
    const mdx = `# Title

<div class="callout">This is a callout.</div>

After the callout.
`;
    const result = await renderer.render(mdx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const html = renderToString(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      result.value.Component as any,
    );
    expect(html).toContain('class="callout"');
    expect(html).toContain("This is a callout");
  });

  it("attaches filePath to error messages for debuggability", async () => {
    // invalid frontmatter (YAML parse error)
    const mdx = `---
title: "unterminated
---

# body
`;
    const result = await renderer.render(mdx, { filePath: "content/x.mdx" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("frontmatter_error");
    expect(result.error.message).toContain("content/x.mdx");
  });

  // ── Error mapping ──────────────────────────────────────────

  it("returns frontmatter_error on malformed YAML frontmatter", async () => {
    // Tab-indented key inside a flow-style mapping is a hard YAML
    // parse error (not a lenient thing that gray-matter would
    // accept). Verified against js-yaml: throws YAMLException.
    const mdx = `---
foo: [a, b
  bad: indent
---

# body
`;
    const result = await renderer.render(mdx);
    if (result.ok) {
      throw new Error(
        `expected frontmatter_error, got ok with frontmatter: ${JSON.stringify(result.value.frontmatter)}`,
      );
    }
    expect(result.error.kind).toBe("frontmatter_error");
  });

  it("returns compile_error on syntactically invalid MDX", async () => {
    // Unclosed JSX tag.
    const mdx = "# Title\n\n<div>open but never closed\n";
    const result = await renderer.render(mdx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.kind).toBe("compile_error");
  });

  // ── Cache ──────────────────────────────────────────────────

  it("caches the result so re-rendering the same source returns the same instance", async () => {
    const first = await renderer.render(SAMPLE_MDX);
    const second = await renderer.render(SAMPLE_MDX);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    // Same compiled element reference — that's the cache promise.
    expect(second.value.Component).toBe(first.value.Component);
  });

  it("treats different sources as different cache entries", async () => {
    const mdx1 = "# First\n\nBody 1.\n";
    const mdx2 = "# Second\n\nBody 2.\n";
    const a = await renderer.render(mdx1);
    const b = await renderer.render(mdx2);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.value.Component).not.toBe(b.value.Component);
  });

  it("evicts the oldest entry when the cache reaches capacity", async () => {
    const tiny = new NextMdxRenderer({ capacity: 3 });

    const m1 = "# one\n\n";
    const m2 = "# two\n\n";
    const m3 = "# three\n\n";
    const m4 = "# four\n\n";

    const a = await tiny.render(m1);
    const b = await tiny.render(m2);
    const c = await tiny.render(m3);
    const d = await tiny.render(m4);
    expect(a.ok && b.ok && c.ok && d.ok).toBe(true);
    if (!a.ok || !b.ok || !c.ok || !d.ok) return;

    // Re-render m1: should be a fresh compile (cache miss + m1
    // was evicted when m4 was inserted).
    const aPrime = await tiny.render(m1);
    expect(aPrime.ok).toBe(true);
    if (!aPrime.ok) return;
    // Different reference — proves m1 was evicted and re-compiled.
    expect(aPrime.value.Component).not.toBe(a.value.Component);
  });

  it("bump-recency on cache hit: re-inserting on hit preserves later-inserted entries", async () => {
    const tiny = new NextMdxRenderer({ capacity: 2 });

    const m1 = "# one\n\n";
    const m2 = "# two\n\n";
    const m3 = "# three\n\n";

    const a = await tiny.render(m1);
    const b = await tiny.render(m2);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    // Re-render m1: this is a hit, so it should be re-inserted,
    // pushing m1 to the most-recently-used end. m2 becomes the
    // oldest, so m2 should be evicted when m3 is inserted next.
    const aPrime = await tiny.render(m1);
    expect(aPrime.ok).toBe(true);
    if (!aPrime.ok) return;
    expect(aPrime.value.Component).toBe(a.value.Component);

    // Insert m3: evicts m2 (oldest), not m1. m1 is still cached.
    const c = await tiny.render(m3);
    expect(c.ok).toBe(true);
    if (!c.ok) return;

    // Re-render m1: should still be a cache hit (same Component
    // reference as the very first `a`). This is the proof that
    // m1 survived the eviction.
    const aSecondPrime = await tiny.render(m1);
    expect(aSecondPrime.ok).toBe(true);
    if (!aSecondPrime.ok) return;
    expect(aSecondPrime.value.Component).toBe(a.value.Component);
  });

  it("clearCache() empties the cache (subsequent renders are fresh)", async () => {
    const first = await renderer.render(SAMPLE_MDX);
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    renderer.clearCache();
    const second = await renderer.render(SAMPLE_MDX);
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    // New compile — different reference, since the cache was
    // emptied between the two calls.
    expect(second.value.Component).not.toBe(first.value.Component);
  });
});
