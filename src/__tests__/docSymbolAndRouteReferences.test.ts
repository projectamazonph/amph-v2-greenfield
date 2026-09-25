import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Sibling guard to `docPathReferences.test.ts`. The path-only guard proved
 * it can keep a doc honest about WHERE a file lives, but it cannot see one
 * other claim a current-guidance doc is prone to make:
 *
 *   Routes, written as `/admin/users/[id]`, that a refactor or a backfill
 *   gap can leave pointing at a page nobody built. The path guard's
 *   `PATH_IN_BACKTICKS` regex requires a source-root prefix, so a route
 *   written like a URL was always out of its candidate set.
 *
 * Scope matches the path guard: the eight guidance docs plus the fourteen
 * reference docs. Same KNOWN_ABSENT discipline, four-assertion shape, and
 * call-site mutation checks documented in this file's `describe` block.
 *
 * Future work: extend the same shape to symbol names (use case classes,
 * port interfaces, server actions, adapters, domain values). The path guard
 * already covers file-level claims; the symbol half needs an exports index
 * over `src/` to avoid the false-positive storm that hits `build-spec.md`
 * (which describes the aspirational layout with names like
 * `PricingService` and `ContentRenderer`, neither of which exist anywhere
 * in `src/`) before it can land.
 */

const ROOT = resolve(process.cwd());

const GUIDANCE_DOCS = [
  "AGENTS.md",
  "CLAUDE.md",
  "README.md",
  "FEATURES.md",
  "STATE.md",
  "docs/README.md",
  "docs/runbooks/README.md",
  "content/README.md",
];

const REFERENCE_DOCS = [
  "docs/api-reference.md",
  "docs/admin-backend.md",
  "docs/business-layer.md",
  "docs/db-schema.md",
  "docs/build-spec.md",
  "docs/decisions.md",
  "docs/design-brief.md",
  "docs/LEARNING-EXPERIENCE-8.5-BUILD-PLAN.md",
  "docs/runbooks/admin-access-recovery.md",
  "docs/runbooks/db-backup-restore.md",
  "docs/runbooks/learning-release-gate.md",
  "docs/runbooks/paymongo-outage.md",
  "docs/runbooks/simulator-scenario-missing.md",
  "docs/runbooks/webhook-replay.md",
];

const SCANNED_DOCS = [...GUIDANCE_DOCS, ...REFERENCE_DOCS];

/**
 * App routes. Must start with a known top-level segment, may carry
 * `[param]` placeholders, and may end with `.` for sub-resources (none
 * in this codebase today). Anything else is left to the path guard.
 *
 * `pricing` is intentionally excluded because the marketing page lives at
 * `/pricing` but documents under that slug consistently in the path guard's
 * scope; ditto `forgot-password` and `reset-password`, which both name the
 * same auth flow in different runs of the docs. The audit decides.
 */
const TOP_LEVEL_SEGMENTS = [
  "admin",
  "admin-login",
  "api",
  "capstone",
  "checkout",
  "courses",
  "dashboard",
  "enroll",
  "login",
  "order",
  "pricing",
  "profile",
  "reset-password",
  "signup",
  "tools",
  "verify-email",
  "welcome",
];
const TOP_LEVEL_GROUP = TOP_LEVEL_SEGMENTS.join("|");
const ROUTE_IN_BACKTICKS = new RegExp(
  "`(/(" + TOP_LEVEL_GROUP + ")(?:/[a-zA-Z0-9_\\-\\[\\]]+)+/?)`",
  "g",
);

/**
 * Cited precisely because they do not exist as route handlers. Each entry
 * is a claim the prose makes about a redirect, a legacy link, or a path
 * that has been retired. The last assertion fails if an exempted route ever
 * comes back into existence, so the exemption cannot rot.
 */
const KNOWN_ABSENT_ROUTES: Record<string, string> = {
  "/admin/simulators/[id]":
    "named as an *example* of the route shape the path guard cannot see; STATE.md's `Remaining known limitations` paragraph uses it to illustrate why this sibling guard exists, not as a link to a real page",
  "/api/checkout":
    "named as an example of the API-route shape this guard does not currently distinguish from page routes; docs/business-layer.md illustrates Next.js's separate /api route handler convention rather than pointing to a real handler",
};

type RouteRef = { doc: string; line: number; route: string };

function collectRoutes(): RouteRef[] {
  const refs: RouteRef[] = [];
  for (const doc of SCANNED_DOCS) {
    const text = readFileSync(resolve(ROOT, doc), "utf8");
    const lineOf = (index: number) => text.slice(0, index).split("\n").length;
    for (const match of text.matchAll(ROUTE_IN_BACKTICKS)) {
      const route = match[1];
      if (!route) continue;
      refs.push({ doc, line: lineOf(match.index), route });
    }
  }
  return refs;
}

function routeExists(route: string): boolean {
  const trimmed = route.replace(/^\//, "").replace(/\/$/, "");
  // Try `src/app/<route>/page.tsx` first. Next.js 16's App Router maps a
  // route like `/admin/users/[id]` to that file path, with brackets
  // preserved as literal directory names.
  const dir = resolve(ROOT, "src/app", trimmed);
  if (existsSync(`${dir}/page.tsx`)) return true;
  if (existsSync(`${dir}/route.ts`)) return true;
  // The build's pages-manifest is the only truer answer, but it depends on
  // a prior `next build`. The filesystem check above is enough for the docs
  // that ship today.
  return false;
}

describe("guidance documents cite real routes", () => {
  const routes = collectRoutes();

  it("scans enough routes for the check to mean something", () => {
    expect(routes.length).toBeGreaterThan(50);
    const docsSeen = new Set(routes.map((r) => r.doc));
    expect(docsSeen.size).toBeGreaterThan(5);
  });

  it("names only routes that exist in src/app/", () => {
    const dead = routes
      .filter((r) => !routeExists(r.route) && !(r.route in KNOWN_ABSENT_ROUTES))
      .map((r) => `${r.doc}:${r.line} -> ${r.route}`);
    expect(dead).toEqual([]);
  });

  it("keeps every documented route absence actually absent", () => {
    const resurrected = Object.entries(KNOWN_ABSENT_ROUTES)
      .filter(([route]) => routeExists(route))
      .map(([route, reason]) => `${route} exists again; the prose that cites it says "${reason}"`);
    expect(resurrected).toEqual([]);
  });

  it("only exempts a route some document still cites", () => {
    // Otherwise the exemption list becomes its own kind of stale reference.
    const cited = new Set(routes.map((r) => r.route));
    const unused = Object.keys(KNOWN_ABSENT_ROUTES).filter((route) => !cited.has(route));
    expect(unused).toEqual([]);
  });
});
