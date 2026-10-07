import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Sibling guard to `docPathReferences.test.ts`. The path-only guard proved
 * it can keep a doc honest about WHERE a file lives, but it cannot see two
 * other claims a current-guidance doc is prone to make:
 *
 *   1. Routes, written as `/admin/users/[id]`, that a refactor or a backfill
 *      gap can leave pointing at a page nobody built. The path guard's
 *      `PATH_IN_BACKTICKS` regex requires a source-root prefix, so a route
 *      written like a URL was always out of its candidate set.
 *
 *   2. Symbol names, written as `AdminSetLiveClassRecording`, that a
 *      renamed-or-deleted use case leaves as a stale claim. The path guard
 *      is shape-blind to identifiers; the symbol half builds an exports
 *      index over `src/usecases/` and the rest of `src/`, so a name that
 *      exists as any class/interface/type/function in any layer is treated
 *      as a real symbol reference, and only an identifier that exists
 *      nowhere in `src/` is a failure.
 *
 * Scope matches the path guard: the eight guidance docs plus the fourteen
 * reference docs. Same KNOWN_ABSENT discipline for routes, and an inline
 * `<!-- doc-symbol-opt-out: Name -->` marker for symbols, documented
 * below. Four-assertion shape, with one set per guard, all in this file.
 *
 * Why the inline marker (symbol half) rather than a `KNOWN_ABSENT` map
 * (route half). A route absence is a one-line fact ("there is no
 * `/admin/simulators/[id]`") and the test-side reason field is the
 * authoritative place to record why. A symbol absence is more often a
 * sentence in the doc itself that says "the use case `Foo` is wired in
 * here," and a marker on the same line makes the historical intent
 * visible to the next reader of the doc. The route half has had no marker
 * requirement to date and is unchanged; the symbol half is new and uses a
 * marker because the new design asks for one.
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

// =====================================================================
// Symbol half. A backticked CamelCase identifier in a guidance doc is a
// claim that the name resolves to a real symbol in the source. The claim
// is in scope for this guard when the name looks like a use case (verb-led
// imperative or `Admin` prefix). Those are the names the docs are
// typically talking about when they name an action. The candidate set is
// then resolved against two indexes:
//   - `useCaseClassNames`, the set of `export class X` names declared in
//     `src/usecases/**/*.ts` (excluding `__tests__/`).
//   - `layerSymbolNames`, the set of every exported class/interface/
//     type/function/const name in `src/domain/`, `src/ports/`,
//     `src/infra/`, `src/components/`, and `src/app/`. This is the
//     layer-aware fallback: when a doc names a form, a button, an
//     adapter, a port, or a domain value with a use-case-shaped prefix,
//     that name is real, just not a use case, so the claim is honored.
// Anything not in either index is a stale claim. The exception is the
// inline opt-out marker described next.
// =====================================================================

/**
 * Backticked identifier whose first PascalCase segment matches a use case
 * verb prefix. The shape filter is what picks out use case claims; noun
 * names like `Course` or `PaymentGateway` do not match any verb prefix and
 * stay out of the candidate set. The verb set is derived from the real
 * `src/usecases/` index rather than hardcoded, so renaming a use case
 * class shifts the prefix set automatically.
 */
const BACKTICKED_CAMEL = /`([A-Z][A-Za-z0-9]+)`/g;
const PASCAL_SEGMENT = /[A-Z][a-z0-9]*/g;

/**
 * Standard-library and ambient names that docs backtick for emphasis but
 * that are not project code. Pulled from the same project-wide
 * denylist-style set used by the path guard. Anything matched here is
 * filtered before the verb-prefix check.
 */
const NON_PROJECT_NAMES = new Set([
  "Result",
  "Money",
  "Promise",
  "Array",
  "Map",
  "Set",
  "Object",
  "String",
  "Number",
  "Boolean",
  "Error",
  "TypeError",
  "RangeError",
  "Date",
  "RegExp",
  "URL",
  "Headers",
  "Request",
  "Response",
  "HTMLElement",
  "Element",
  "NodeJS",
  "Buffer",
  "Partial",
  "Required",
  "Readonly",
  "Pick",
  "Omit",
  "Record",
  "Exclude",
  "Extract",
  "ReturnType",
  "Parameters",
  "InstanceType",
  "ThisType",
  "ThisParameterType",
  "Awaited",
  "NonNullable",
  "Uppercase",
  "Lowercase",
  "Capitalize",
  "Uncapitalize",
  "JSON",
  "Math",
  "Symbol",
  "BigInt",
  "Function",
  "Iterator",
  "Iterable",
  "AsyncIterator",
  "Generator",
  "AsyncGenerator",
  "Disposable",
  "JSX",
  "React",
  "Component",
  "Props",
  "State",
  "ReactNode",
  "ReactElement",
  "RefObject",
  "EventHandler",
  "FC",
  "VFC",
  "FCProps",
  "Module",
  "Course",
  "Lesson",
  "Quiz",
  "Attempt",
  "Assignment",
  "Capstone",
  "Project",
  "Source",
  "Target",
  "Class",
  "Mix",
  "Mode",
  "Style",
  "Theme",
  "Layout",
  "Section",
  "Header",
  "Footer",
  "Sidebar",
  "Main",
  "Aside",
  "Article",
  "Nav",
  "Menu",
  "Item",
  "Row",
  "Cell",
  "Column",
  "Field",
  "Group",
  "Stack",
  "Box",
  "Text",
  "Button",
  "Input",
  "Label",
  "Form",
  "Table",
  "List",
  "Grid",
  "Page",
  "Container",
  "Wrapper",
  "Provider",
  "Context",
  "Hook",
  "Effect",
  "Memo",
  "Callback",
  "Render",
  "Mount",
  "Unmount",
  "Update",
  "Event",
  "Timer",
  "Stream",
  "Channel",
  "Pipe",
  "Worker",
  "Server",
  "Client",
  "Service",
  "Controller",
  "Router",
  "Handler",
  "Driver",
  "Adapter",
  "Bridge",
  "Facade",
  "Strategy",
  "Factory",
  "Builder",
  "Singleton",
  "Observer",
  "Subject",
  "Listener",
  "Emitter",
  "Dispatcher",
  "Repository",
  "Store",
  "Cache",
  "Index",
  "Token",
  "Session",
  "Cookie",
  "Body",
  "Query",
  "Param",
  "Schema",
  "Validator",
  "Parser",
  "Serializer",
  "Encoder",
  "Decoder",
  "Cipher",
  "Hash",
  "Key",
  "Salt",
  "Secret",
  "Certificate",
  "Signature",
  "Payload",
  "Trailer",
  "Frame",
  "Message",
  "Signal",
  "Command",
  "Failure",
  "Success",
  "Exception",
  "Trace",
  "Log",
  "Metric",
  "Span",
  "Carrier",
  "Baggage",
  "Propagator",
  "Exporter",
  "Collector",
  "Sampler",
  "Resource",
  "Attribute",
  "Link",
  "Tracer",
  "Logger",
  "ContextManager",
  "TextMapPropagator",
  "BatchSpanProcessor",
  "SimpleSpanProcessor",
  "ConsoleSpanExporter",
  "InMemorySpanExporter",
  "AlwaysOnSampler",
  "AlwaysOffSampler",
  "ParentBasedSampler",
  "TraceIdRatioBasedSampler",
  "NodeTracerProvider",
  "BasicTracerProvider",
  "BatchLogRecordProcessor",
  "SimpleLogRecordProcessor",
  "ConsoleLogRecordExporter",
  "InMemoryLogRecordExporter",
  "PeriodicExportingMetricReader",
  "PullController",
  "PushController",
  "MetricReader",
  "MetricExporter",
  "View",
  "Aggregation",
  "Instrumentation",
  "DiagLogger",
  "LogLevel",
  "MeterProvider",
  "LoggerProvider",
  "TracerProvider",
  "ContextAPI",
  "diag",
  "metrics",
  "trace",
  "logs",
  "value",
  "context",
  "propagation",
  "VERSION",
  "SDK_NAME",
  "SDK_VERSION",
  "API_NAME",
  "API_VERSION",
]);

/**
 * Inline opt-out marker. Placed on the same line as a backticked symbol
 * that the doc is intentionally naming as historical (a merged-PR
 * changelog entry, an ADR describing a rejected approach, a STATE.md
 * "Remaining known limitations" example). Multiple names are
 * comma-separated.
 *
 * Format: `<!-- doc-symbol-opt-out: Name1, Name2 -->`. Anything matching
 * this pattern on a line is excluded from the symbol check. If a name
 * is marked but later lands as a real use case, the resurrected-marker
 * assertion below fails so the marker is removed.
 */
const SYMBOL_OPT_OUT = /<!--\s*doc-symbol-opt-out:\s*([A-Za-z0-9_, ]+?)\s*-->/;

/**
 * Build the use case class index by reading every `.ts` file under
 * `src/usecases/` (test fixtures excluded) and collecting the names
 * declared after `export class`. Same regex family as the candidate
 * scan, so a class named only in a comment is not picked up.
 */
function buildUseCaseClassIndex(): Set<string> {
  const out = new Set<string>();
  walk("src/usecases", (path) => {
    if (!path.endsWith(".ts")) return;
    const text = readFileSync(path, "utf8");
    for (const m of text.matchAll(/export class (\w+)/g)) {
      const name = m[1];
      if (name) out.add(name);
    }
  });
  return out;
}

/**
 * Build the layer-aware symbol index over `src/`. Every exported
 * class/interface/type/function/async-function/const whose identifier is
 * a valid TS identifier is collected. A name that is exported from any
 * of `src/domain/`, `src/ports/`, `src/infra/`, `src/components/`, or
 * `src/app/` is considered "real" and exempts the doc claim, on the
 * principle that the doc is referring to a real symbol, just not a use
 * case. This is what lets `ResendEmailSender` (infra), `ProcessDiagram`
 * (components), and `GradeAssignmentForm` (app) coexist with use case
 * class names in the same scan without false positives.
 */
const LAYER_ROOTS = ["src/domain", "src/ports", "src/infra", "src/components", "src/app"];

function buildLayerSymbolIndex(): Set<string> {
  const out = new Set<string>();
  const seen = new Set<string>();
  const exportPattern =
    /export (?:class|interface|type|function|async function|const) ([A-Za-z_$][\w$]*)/g;
  for (const root of LAYER_ROOTS) {
    walk(root, (path) => {
      if (seen.has(path)) return;
      seen.add(path);
      if (!path.endsWith(".ts") && !path.endsWith(".tsx")) return;
      const text = readFileSync(path, "utf8");
      for (const m of text.matchAll(exportPattern)) {
        const name = m[1];
        if (name) out.add(name);
      }
    });
  }
  return out;
}

/**
 * Recursive directory walker. Yields each regular file path via the
 * callback. Stops at `node_modules`, `.next`, and `.git` to keep the
 * scan bounded to the source the project actually ships.
 */
function walk(root: string, visit: (path: string) => void): void {
  let entries: string[];
  try {
    entries = readdirSync(root);
  } catch {
    return;
  }
  for (const entry of entries) {
    const path = `${root}/${entry}`;
    let stat;
    try {
      stat = statSync(path);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
      walk(path, visit);
    } else {
      visit(path);
    }
  }
}

type SymbolRef = {
  doc: string;
  line: number;
  name: string;
  optedOut: boolean;
};

function collectSymbolRefs(useCaseVerbPrefixes: Set<string>): SymbolRef[] {
  const refs: SymbolRef[] = [];
  for (const doc of SCANNED_DOCS) {
    let text: string;
    try {
      text = readFileSync(resolve(ROOT, doc), "utf8");
    } catch {
      continue;
    }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const optOutMatch = line.match(SYMBOL_OPT_OUT);
      const optedOutNames = new Set<string>();
      if (optOutMatch && optOutMatch[1]) {
        for (const raw of optOutMatch[1].split(",")) {
          const trimmed = raw.trim();
          if (trimmed) optedOutNames.add(trimmed);
        }
      }
      for (const m of line.matchAll(BACKTICKED_CAMEL)) {
        const name = m[1];
        if (!name || name.length < 5) continue;
        if (NON_PROJECT_NAMES.has(name)) continue;
        const first = name.match(/^([A-Z][a-z0-9]+)/);
        if (!first || !first[1]) continue;
        if (!useCaseVerbPrefixes.has(first[1])) continue;
        refs.push({
          doc,
          line: i + 1,
          name,
          optedOut: optedOutNames.has(name),
        });
      }
    }
  }
  return refs;
}

/**
 * Reads every backticked opt-out marker in the scanned docs and returns
 * the set of names that the docs claim are intentionally historical.
 * Used by the resurrected-marker assertion: if any of these names later
 * resolves in the use case class index, the marker is stale and the
 * doc should drop it.
 */
function collectOptedOutNames(): Map<string, { doc: string; line: number }[]> {
  const out = new Map<string, { doc: string; line: number }[]>();
  for (const doc of SCANNED_DOCS) {
    let text: string;
    try {
      text = readFileSync(resolve(ROOT, doc), "utf8");
    } catch {
      continue;
    }
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const m = line.match(SYMBOL_OPT_OUT);
      if (!m || !m[1]) continue;
      for (const raw of m[1].split(",")) {
        const trimmed = raw.trim();
        if (!trimmed) continue;
        const list = out.get(trimmed) ?? [];
        list.push({ doc, line: i + 1 });
        out.set(trimmed, list);
      }
    }
  }
  return out;
}

const useCaseClassNames = buildUseCaseClassIndex();
const layerSymbolNames = buildLayerSymbolIndex();
const useCaseVerbPrefixes = (() => {
  const prefixes = new Set<string>();
  for (const name of useCaseClassNames) {
    const segs = name.match(PASCAL_SEGMENT);
    if (segs && segs[0]) prefixes.add(segs[0]);
  }
  return prefixes;
})();

describe("guidance documents cite real use case classes", () => {
  const refs = collectSymbolRefs(useCaseVerbPrefixes);
  const optOuts = collectOptedOutNames();

  it("scans enough symbols for the check to mean something", () => {
    expect(refs.length).toBeGreaterThan(50);
    const docsSeen = new Set(refs.map((r) => r.doc));
    expect(docsSeen.size).toBeGreaterThan(5);
    // Every backticked use-case-shaped identifier either names a real
    // use case or names a real symbol in some other layer. The total
    // resolves to the union of those two indexes, and the assertion
    // fails if the layer index ever drops to empty (i.e. the scan
    // configuration has rotted).
    expect(useCaseClassNames.size).toBeGreaterThan(50);
    expect(layerSymbolNames.size).toBeGreaterThan(100);
  });

  it("names only use case classes that exist in src/usecases/, or symbols that exist in src/", () => {
    const dead = refs
      .filter((r) => !r.optedOut && !useCaseClassNames.has(r.name) && !layerSymbolNames.has(r.name))
      .map((r) => `${r.doc}:${r.line} -> ${r.name}`);
    expect(dead).toEqual([]);
  });

  it("every opted-out symbol is still opted out (the marker is not stale)", () => {
    // If a name is marked historical in a doc but the use case it
    // names has since been added to `src/usecases/`, the marker is
    // obsolete. The doc should drop the marker and the prose should
    // update to remove the historical framing. This assertion is
    // what catches the next agent who lands a use case the doc said
    // was impossible.
    const resurrected: string[] = [];
    for (const [name, sites] of optOuts) {
      if (useCaseClassNames.has(name)) {
        for (const site of sites) {
          resurrected.push(`${site.doc}:${site.line} -> ${name} (now in src/usecases/)`);
        }
      }
    }
    expect(resurrected).toEqual([]);
  });

  it("every opt-out marker exempts at least one backticked identifier on its line", () => {
    // Otherwise the marker is dead syntax. A doc author who added
    // `<!-- doc-symbol-opt-out: Foo -->` to a line that does not
    // backtick `Foo` was either confused or pasting boilerplate, and
    // either way the marker should be removed. The guard is allowed
    // to flag this because it is a real defect, not a stylistic one.
    const dead: string[] = [];
    for (const [name, sites] of optOuts) {
      for (const site of sites) {
        const onLine = refs.some(
          (r) => r.doc === site.doc && r.line === site.line && r.name === name,
        );
        if (!onLine) dead.push(`${site.doc}:${site.line} -> ${name}`);
      }
    }
    expect(dead).toEqual([]);
  });
});
