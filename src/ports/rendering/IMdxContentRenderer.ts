/**
 * IMdxContentRenderer — port for compiling MDX source into a renderable
 * React element plus parsed frontmatter.
 *
 * STORY-012: MDX content renderer port + adapter.
 *
 * The renderer takes MDX *source as a string* — file I/O is the caller's
 * concern (STORY-013's import script; the future lesson page at STORY-026).
 * That keeps the port framework-agnostic and easy to test in isolation.
 *
 * The output carries:
 * - `frontmatter` — the parsed YAML frontmatter block (the bit between
 *   the leading and trailing `---`).
 * - `Component` — the compiled React element, opaque `unknown` to
 *   keep React out of the port. The adapter returns a real React
 *   element from `next-mdx-remote/rsc`'s `compileMDX`.
 *
 * Consumers (the lesson page) render the element directly:
 *
 *     const { Component } = await render(mdx);
 *     return <article>{Component}</article>;
 *
 * Tests that need a static-HTML snapshot render the element via
 * `react-dom/server`'s `renderToString` themselves — keeping the
 * adapter free of `react-dom/server` lets it bundle into paths
 * (middleware, route handlers) that forbid the Node server runtime.
 *
 * Errors are mapped to a discriminated union so callers can pattern-
 * match without string parsing:
 * - `frontmatter_error` — YAML is malformed
 * - `compile_error` — MDX body is syntactically invalid
 * - `internal_error` — anything else (e.g. cache corruption)
 *
 * ADR-014: every port method returns `Result<T, E>`. No exceptions
 * across layer boundaries.
 */

import type { Result } from "@/domain/shared/Result";

/**
 * Known frontmatter fields for AMPH lessons. Anything else is preserved
 * in the `[key: string]: unknown` index so future schema additions
 * don't get dropped on the floor.
 */
export interface MdxFrontmatter {
  readonly title?: string;
  readonly slug?: string;
  readonly moduleNumber?: number;
  readonly lessonNumber?: number;
  readonly type?: "reading" | "video" | "exercise";
  readonly estimatedMinutes?: number;
  readonly xpReward?: number;
  readonly [key: string]: unknown;
}

/**
 * The output of `render()`. `Component` is typed as `unknown` because
 * the port must not depend on React. The structural contract is
 * "a renderable React tree element" — the adapter returns the
 * pre-compiled React element from `next-mdx-remote/rsc`'s
 * `compileMDX`. The element is keyed by content hash in the
 * adapter's internal cache, so identical MDX across calls shares
 * the same React tree.
 */
export interface MdxRendered {
  readonly frontmatter: MdxFrontmatter;
  readonly Component: unknown;
}

export type MdxRenderError =
  | { kind: "frontmatter_error"; message: string }
  | { kind: "compile_error"; message: string }
  | { kind: "internal_error"; message: string };

export interface IMdxContentRenderer {
  /**
   * Compile MDX source into a renderable React element + parsed
   * frontmatter.
   *
   * Idempotent: re-compiling the same source string returns the
   * cached result. The cache is content-addressed (sha1 of the
   * source), so identical MDX across files shares compiled output.
   *
   * @param source  The raw MDX source (frontmatter optional).
   * @param options.filePath  Optional path used for error messages
   *                          and debug logging. Not part of the
   *                          cache key.
   */
  render(
    source: string,
    options?: { filePath?: string },
  ): Promise<Result<MdxRendered, MdxRenderError>>;

  /**
   * Invalidate the internal compile cache. Provided for tests;
   * production never needs to call this.
   */
  clearCache(): void;
}
