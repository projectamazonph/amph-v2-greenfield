/**
 * NextMdxRenderer — production adapter for IMdxContentRenderer.
 *
 * STORY-012: MDX content renderer port + adapter.
 *
 * Uses `next-mdx-remote/rsc` for MDX compilation and `gray-matter` for
 * frontmatter parsing. Returns a pre-compiled React element (the
 * `content` from `compileMDX`) plus the parsed frontmatter.
 *
 * Deliberately does NOT import `react-dom/server` — that would
 * force `react-dom/server` into the bundle for any code path that
 * touches the composition container (middleware, route handlers,
 * etc.), which Next.js / Turbopack rejects because the Node
 * server runtime can't run in those contexts. Tests that need a
 * static HTML snapshot call `react-dom/server`'s `renderToString`
 * themselves on the returned `Component`.
 *
 * Cache: content-addressed (sha1 of the source string), bounded LRU.
 * Identical MDX across files shares compiled output, which matters
 * for the lesson page (STORY-026) where the same lesson can be
 * previewed by multiple users in parallel.
 *
 * Error mapping:
 * - gray-matter throws on bad YAML → `frontmatter_error`
 * - compileMDX throws on bad MDX → `compile_error`
 * - any other throw (cache corruption, OOM) → `internal_error`
 *
 * `next-mdx-remote/rsc` is a server-only package (it bundles the
 * React Server Components runtime), so this file is server-only.
 */

import "server-only";
import { createHash } from "node:crypto";
import { compileMDX } from "next-mdx-remote/rsc";
import matter from "gray-matter";
import { Result } from "@/domain/shared/Result";
import type {
  IMdxContentRenderer,
  MdxRendered,
  MdxRenderError,
  MdxFrontmatter,
} from "@/ports/rendering/IMdxContentRenderer";

/** Default cap on the compile cache. 500 distinct MDX strings is plenty for a course catalog. */
const DEFAULT_CACHE_CAPACITY = 500;

export class NextMdxRenderer implements IMdxContentRenderer {
  /**
   * Content-addressed cache. `Map` preserves insertion order, so
   * "oldest" = first key in iteration. When the cache exceeds
   * `capacity`, the oldest entry is evicted.
   */
  private readonly cache = new Map<string, MdxRendered>();
  private readonly capacity: number;

  constructor(options: { capacity?: number } = {}) {
    this.capacity = options.capacity ?? DEFAULT_CACHE_CAPACITY;
  }

  async render(
    source: string,
    options: { filePath?: string } = {},
  ): Promise<Result<MdxRendered, MdxRenderError>> {
    const cacheKey = this.cacheKey(source);

    // Cache hit: return the cached value. Bump recency by
    // re-inserting so the eviction order is LRU-ish.
    const hit = this.cache.get(cacheKey);
    if (hit) {
      this.cache.delete(cacheKey);
      this.cache.set(cacheKey, hit);
      return Result.ok(hit);
    }

    // Cache miss: parse frontmatter, compile.
    let frontmatter: MdxFrontmatter;
    try {
      const parsed = matter(source);
      frontmatter = parsed.data as MdxFrontmatter;
    } catch (err) {
      return Result.err({
        kind: "frontmatter_error",
        message: `Failed to parse frontmatter${options.filePath ? ` in ${options.filePath}` : ""}: ${String(err)}`,
      });
    }

    let compiled: { content: unknown };
    try {
      const result = await compileMDX({
        source,
        options: { parseFrontmatter: false },
      });
      compiled = { content: result.content };
    } catch (err) {
      return Result.err({
        kind: "compile_error",
        message: `Failed to compile MDX${options.filePath ? ` in ${options.filePath}` : ""}: ${String(err)}`,
      });
    }

    const rendered: MdxRendered = {
      frontmatter,
      Component: compiled.content,
    };

    // Insert into cache. Evict the oldest entry if we're at capacity.
    if (this.cache.size >= this.capacity) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) this.cache.delete(oldest);
    }
    this.cache.set(cacheKey, rendered);

    return Result.ok(rendered);
  }

  clearCache(): void {
    this.cache.clear();
  }

  /** SHA-1 is plenty for a content-addressed cache (not a security primitive). */
  private cacheKey(source: string): string {
    return createHash("sha1").update(source, "utf8").digest("hex");
  }
}
