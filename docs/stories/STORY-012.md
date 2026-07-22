# STORY-012 — MDX content renderer port + adapter

**Points:** 1
**Sprint:** 3 (Catalog Foundation)
**Date:** 2026-07-22

## What

Introduces the `IMdxContentRenderer` port and a single production adapter
(`NextMdxRenderer`) that compiles `.mdx` source into a renderable React
Server Component plus a static HTML representation, with an in-memory
compile cache keyed by content hash. The actual `.mdx` files live in
`content/curriculum/modules/<module-slug>/<lesson-slug>.mdx` (mirrors the
source layout in `D:\Web Project\amph-v2\content\curriculum\modules\`),
but the renderer itself takes the source as a string — file I/O is
caller-side (STORY-013's import script; the future lesson page).

## Why

The course catalog needs to render rich lesson content (markdown with
React components, frontmatter, code blocks) in React Server Components.
`react-markdown` is already in the dependency tree, but it doesn't
support MDX (the `<Component />` syntax embedded in markdown), and it
can't pre-compile for use as a first-class RSC. The MDX port is the
seam that lets:

- The lesson page (STORY-026) render the compiled RSC.
- The import script (STORY-013) extract frontmatter at build time.
- Tests render the same content via static HTML without spinning up a
  React server.

## Code shape

```
src/ports/rendering/IMdxContentRenderer.ts          ← port
src/infra/rendering/NextMdxRenderer.ts              ← production adapter (next-mdx-remote/rsc + gray-matter)
src/infra/rendering/__tests__/NextMdxRenderer.test.ts ← adapter tests
src/infra/rendering/InMemoryMdxRenderer.ts          ← in-memory adapter (parses frontmatter, throws on compile for non-trivial MDX — fine for tests that don't render)
src/infra/rendering/__tests__/InMemoryMdxRenderer.test.ts
src/composition/container.ts                        ← wire mdxRenderer
src/composition/container.test.ts                   ← assert test container has mdxRenderer
```

## Port contract

```ts
export type MdxRenderError =
  | { kind: "frontmatter_error"; message: string }
  | { kind: "compile_error"; message: string }
  | { kind: "internal_error"; message: string };

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

export interface MdxRendered {
  readonly html: string; // static render for testing + non-React use
  readonly frontmatter: MdxFrontmatter;
  readonly Component: unknown; // MDXContent React component (opaque to port)
}

export interface IMdxContentRenderer {
  render(
    source: string,
    options?: { filePath?: string },
  ): Promise<Result<MdxRendered, MdxRenderError>>;
  clearCache(): void;
}
```

`Component` is typed as `unknown` on purpose — the port must not import
React. The adapter returns a real `MDXContent` component from
`next-mdx-remote/rsc`'s `compileMDX`. Consumers (the lesson page) cast
or render it directly. The static `html` field is a `renderToString`
snapshot of the same Component, useful for tests, accessibility
checks, and `generateMetadata` for SEO.

## Why two adapters

- `NextMdxRenderer` is the production path. It uses `next-mdx-remote/rsc`
  - `gray-matter` and caches compiled output in an in-memory `Map` keyed
    by a SHA-1 of the source string. Cache size is bounded (LRU-ish: at
    N=500 entries, oldest is evicted).
- `InMemoryMdxRenderer` is for use cases and unit tests that don't
  actually need to render (e.g. extracting frontmatter, validating
  MDX well-formedness). It uses the same `gray-matter` frontmatter
  parser, but throws `compile_error` for any non-trivial body. Use
  case: STORY-013's import script will use it to pull frontmatter
  without paying the compile cost.

## Cache semantics

- Cache key: `sha1(source)` — content-addressed, so identical MDX
  shares compiled output across requests.
- Cache hit: returns the cached `MdxRendered` synchronously
  (well, via a resolved `Promise`).
- Cache miss: calls `compileMDX`, stores the result.
- `clearCache()` is provided for tests; production never calls it.
- The cache is bounded (configurable; default 500 entries) to prevent
  unbounded memory growth in long-running Next.js processes.

## Out of scope (belongs to other stories)

- **File I/O** — STORY-013's import script + the future lesson page
  read `.mdx` files from disk and pass the source to the renderer.
- **Custom MDX components** (e.g. a `<Callout>` component that
  renders with AMPH branding) — the renderer accepts a `components`
  prop, but the actual component map is a lesson-page concern.
- **Frontmatter validation** — the renderer parses YAML but does not
  validate it against the AMPH lesson schema. STORY-013 will validate
  in the import script.

## Definition of Done

- [x] `IMdxContentRenderer` port exists with the contract above.
- [x] `NextMdxRenderer` adapter compiles MDX, parses frontmatter,
      caches, and handles all three error kinds.
- [x] `InMemoryMdxRenderer` exists for use cases that only need
      frontmatter / well-formedness.
- [x] Tests: 100% branch coverage of the port's happy path + every
      error kind, plus the cache hit/miss/eviction behavior.
- [x] `mdxRenderer` wired into both `buildProductionContainer()` and
      `buildTestContainer()` in `src/composition/container.ts`.
- [x] `pnpm typecheck`, `pnpm lint`, `pnpm test:arch`, `pnpm build`
      all green.
- [x] PR opened, CI green, squash-merged to `main`.
- [x] `SESSION-HANDOVER.md` updated.
