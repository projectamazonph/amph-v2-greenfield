/**
 * SOLID Compliance — Dependency Cycles.
 *
 * Rule 7 of 8.
 *
 * The src/ import graph MUST be a directed acyclic graph (DAG).
 * Any cycle (A imports B, B imports A; or A → B → C → A) is a
 * structural smell that signals tangled responsibilities.
 *
 * How this is verified:
 *   - Build a graph: every .ts file under src/ is a node.
 *   - For each file, every @/ and relative import is an edge.
 *   - Run Kahn's algorithm (or DFS) to detect cycles.
 *
 * Why: Cycles make code impossible to test in isolation. A change
 * to file A ripples through B and C and back to A. The P0 audit
 * flagged this as a structural risk for the upcoming in-memory →
 * Prisma migration. Catching cycles at the architecture level
 * (not just the typecheck level) lets us prevent refactors that
 * would create them.
 *
 * Strict mode: any cycle = CI failure.
 *
 * Caveats:
 *   - Type-only imports (`import type`) are excluded — they don't
 *     create runtime coupling.
 *   - Self-imports (a file importing itself) are excluded.
 *   - Cycles involving only test files are excluded — tests are
 *     allowed to import from anything in the test suite.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, dirname, resolve as resolvePath } from "node:path";

const SRC = join(process.cwd(), "src");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith(".ts") && !entry.endsWith(".test.ts")) {
      out.push(full);
    }
  }
  return out;
}

const IMPORT_RE = /import\s+(?:type\s+)?[\s\S]*?from\s+["']([^"']+)["']/g;

function importsOf(file: string): string[] {
  const body = readFileSync(file, "utf8");
  const lines = body.split("\n");
  const targets = new Set<string>();
  for (const line of lines) {
    if (/^\s*import\s+type\s/.test(line)) continue;
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(line)) !== null) {
      const spec = m[1] ?? "";
      const resolved = resolveImport(file, spec);
      if (resolved && resolved !== file) {
        targets.add(resolved);
      }
    }
  }
  return [...targets];
}

function resolveImport(fromFile: string, spec: string): string | null {
  if (spec.startsWith("@/")) {
    return join(SRC, spec.slice(2));
  }
  if (spec.startsWith(".")) {
    const abs = resolvePath(join(dirname(fromFile), spec));
    return abs;
  }
  return null;
}

// Kahn's algorithm: build in-degree map, peel off leaves.
function findCycles(graph: Map<string, Set<string>>): string[][] {
  const inDegree = new Map<string, number>();
  for (const node of graph.keys()) {
    inDegree.set(node, 0);
  }
  for (const [, targets] of graph) {
    for (const t of targets) {
      if (graph.has(t)) {
        inDegree.set(t, (inDegree.get(t) ?? 0) + 1);
      }
    }
  }
  const queue: string[] = [];
  for (const [node, deg] of inDegree) {
    if (deg === 0) queue.push(node);
  }
  const removed = new Set<string>();
  while (queue.length > 0) {
    const node = queue.shift()!;
    removed.add(node);
    const targets = graph.get(node) ?? new Set();
    for (const t of targets) {
      const cur = (inDegree.get(t) ?? 0) - 1;
      inDegree.set(t, cur);
      if (cur === 0) queue.push(t);
    }
  }
  // Anything not removed is part of a cycle. Find SCCs among
  // the remaining nodes.
  const cycleNodes = new Set<string>();
  for (const [node, deg] of inDegree) {
    if (deg > 0) cycleNodes.add(node);
  }
  // Simple SCC: BFS from each cycle node, restricting to cycle nodes
  const cycles: string[][] = [];
  const visited = new Set<string>();
  for (const start of cycleNodes) {
    if (visited.has(start)) continue;
    const scc: string[] = [];
    const stack = [start];
    while (stack.length > 0) {
      const node = stack.pop()!;
      if (visited.has(node)) continue;
      visited.add(node);
      scc.push(node);
      const targets = graph.get(node) ?? new Set();
      for (const t of targets) {
        if (cycleNodes.has(t) && !visited.has(t)) {
          stack.push(t);
        }
      }
    }
    if (scc.length > 0) {
      cycles.push(scc.sort());
    }
  }
  return cycles;
}

describe("SOLID compliance: no import cycles in src/", () => {
  const files = walk(SRC);
  const graph = new Map<string, Set<string>>();
  for (const f of files) {
    graph.set(f, new Set(importsOf(f).filter((t) => graph.has(t) || t.endsWith(".ts"))));
  }
  // Rebuild the graph now that we know all files
  const graph2 = new Map<string, Set<string>>();
  for (const f of files) {
    const targets = new Set<string>();
    for (const t of importsOf(f)) {
      if (graph.has(t)) targets.add(t);
    }
    graph2.set(f, targets);
  }

  it("discovers source files (sanity check)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("has no import cycles", () => {
    const cycles = findCycles(graph2);
    if (cycles.length > 0) {
      const report = cycles
        .map(
          (c) =>
            `  Cycle (${c.length} files):\n` +
            c
              .map((f) => `    ${relative(process.cwd(), f)}`)
              .join("\n"),
        )
        .join("\n\n");
      throw new Error(
        `Found ${cycles.length} import cycle(s) in src/:\n\n${report}\n\n` +
          `Cycles indicate tangled responsibilities. Break them by:\n` +
          `  - Moving shared types to a leaf file (no further imports).\n` +
          `  - Inverting the dependency (define a port, depend on it).\n` +
          `  - Extracting common code into a new module that both sides import.`,
      );
    }
    expect(cycles).toEqual([]);
  });
});
