/**
 * SOLID Compliance — D (Dependency Inversion), cross-layer version.
 *
 * Rule 3 of 8.
 *
 * Each layer has allowed import directions. A violation means a
 * higher-level concern is leaking into a lower-level concern (or
 * a sibling layer is being bypassed entirely).
 *
 * Allowed:
 *   - src/usecases/   → domain, ports, shared
 *   - src/infra/      → ports, domain (for adapter types), shared
 *   - src/ports/      → domain, shared (NEVER infra — that would be
 *                       a circular dep: infra depends on ports)
 *   - src/composition/ → usecases, ports, infra, domain, shared
 *                         (composition is the DI wiring root; it
 *                          sees everything by design)
 *   - src/app/        → usecases, composition, ports (for action
 *                       input types), domain (for shared types only)
 *
 * Forbidden cross-layer:
 *   - usecases → infra          (use cases must depend on ports, not impls)
 *   - usecases → composition    (no DI from use cases)
 *   - usecases → app            (no upward reference)
 *   - ports → infra             (would invert the port/adapter pattern)
 *   - ports → usecases          (ports define the contract; use cases
 *                                consume the contract)
 *   - domain → anything outside domain
 *     (covered separately in domain-purity.test.ts)
 *   - infra → usecases          (adapters must not depend on the
 *                                use cases they serve; this prevents
 *                                accidental god-classes)
 *
 * Strict mode: any cross-layer import = CI failure.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

type Layer = "usecases" | "infra" | "ports" | "composition" | "app" | "domain" | "lib" | "proxy";

const SRC_ROOT = join(process.cwd(), "src");

// Files at the very top of src/ that aren't a layer directory.
// proxy.ts is Next.js middleware; lib/ is server-side helpers.
// They behave like app/ for layering purposes.
const ROOT_FILES: Record<string, Layer> = {
  "proxy.ts": "proxy",
};

function layerOf(file: string): Layer {
  // Normalize Windows backslashes to forward slashes so split("/") works
  // on all platforms. `path.relative()` on Windows returns backslashes.
  const rel = relative(SRC_ROOT, file).replace(/\\/g, "/");
  if (!rel.includes("/")) {
    return ROOT_FILES[rel] ?? "app";
  }
  const top = rel.split("/")[0] as Layer;
  return top;
}

type Rule = {
  from: Layer;
  to: Layer | "*";
  allow?: "value" | "type-only" | "all";
};

// Per-layer allow-list. Default-deny: anything not listed is forbidden.
// "all" means both `import` and `import type` are allowed.
// "value" means only `import type` is allowed; value imports are forbidden.
const RULES: Rule[] = [
  // usecases can depend on domain, ports, shared (no infra, no app)
  { from: "usecases", to: "usecases", allow: "all" },
  { from: "usecases", to: "ports", allow: "all" },
  { from: "usecases", to: "domain", allow: "all" },
  // infra can depend on ports (implements them), domain (for types)
  { from: "infra", to: "ports", allow: "all" },
  { from: "infra", to: "domain", allow: "all" },
  { from: "infra", to: "infra", allow: "all" },
  // ports can only depend on domain (and shared within domain)
  { from: "ports", to: "domain", allow: "all" },
  { from: "ports", to: "ports", allow: "all" },
  // composition is the DI root — can see everything
  { from: "composition", to: "*", allow: "all" },
  // app (Next.js) can see usecases (for action entry points), ports
  // (for input types), domain (for value types). No direct infra
  // access — go through usecases.
  { from: "app", to: "usecases", allow: "all" },
  { from: "app", to: "ports", allow: "all" },
  { from: "app", to: "domain", allow: "all" },
  { from: "app", to: "composition", allow: "all" },
  { from: "app", to: "lib", allow: "all" },
  { from: "app", to: "app", allow: "all" },
  // lib (server-side helpers, e.g. auth.ts) can use composition,
  // domain, ports — but never infra directly.
  { from: "lib", to: "usecases", allow: "all" },
  { from: "lib", to: "ports", allow: "all" },
  { from: "lib", to: "domain", allow: "all" },
  { from: "lib", to: "composition", allow: "all" },
  { from: "lib", to: "lib", allow: "all" },
  // proxy.ts is Next.js middleware — same rules as app
  { from: "proxy", to: "usecases", allow: "all" },
  { from: "proxy", to: "ports", allow: "all" },
  { from: "proxy", to: "domain", allow: "all" },
  { from: "proxy", to: "composition", allow: "all" },
  { from: "proxy", to: "lib", allow: "all" },
];

function isAllowed(from: Layer, to: Layer): boolean {
  if (from === to) return true;
  return RULES.some((r) => r.from === from && (r.to === to || r.to === "*"));
}

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

interface Violation {
  file: string;
  line: number;
  text: string;
  from: Layer;
  to: Layer;
}

const IMPORT_RE = /import\s+(?:type\s+)?[\s\S]*?from\s+["']([^"']+)["']/g;

function scanFile(file: string): Violation[] {
  const body = readFileSync(file, "utf8");
  const lines = body.split("\n");
  const violations: Violation[] = [];
  const fromLayer = layerOf(file);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    IMPORT_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = IMPORT_RE.exec(line)) !== null) {
      const spec = m[1] ?? "";
      // Only check @/ aliases and relative imports
      const target = resolveLayerTarget(file, spec);
      if (!target) continue;
      // Allow `import type` across any boundary. Type-only imports
      // do not create runtime coupling (TypeScript erases them) and
      // are essential for declaring interface conformance in domain
      // (e.g. `class BidElevatorSimulator implements Simulator`).
      const isTypeOnly = /^\s*import\s+type\s/.test(line);
      if (isTypeOnly) continue;
      if (!isAllowed(fromLayer, target)) {
        violations.push({
          file: relative(process.cwd(), file),
          line: i + 1,
          text: line.trim(),
          from: fromLayer,
          to: target,
        });
      }
    }
  }
  return violations;
}

function resolveLayerTarget(fromFile: string, spec: string): Layer | null {
  // @/... alias
  if (spec.startsWith("@/")) {
    const rest = spec.slice(2);
    const top = rest.split("/")[0] as Layer;
    if (["usecases", "infra", "ports", "composition", "app", "domain", "lib"].includes(top)) {
      return top;
    }
    return null;
  }
  // Relative import
  if (spec.startsWith(".")) {
    const fromDir = join(fromFile, "..");
    const abs = join(fromDir, spec);
    // Find the first segment after src/
    // Normalize Windows backslashes so split("/") works on all platforms.
    const rel = relative(SRC_ROOT, abs).replace(/\\/g, "/");
    if (!rel.includes("/")) {
      return ROOT_FILES[rel] ?? null;
    }
    const top = rel.split("/")[0] as Layer;
    if (["usecases", "infra", "ports", "composition", "app", "domain", "lib"].includes(top)) {
      return top;
    }
  }
  return null;
}

describe("SOLID compliance: dependency direction", () => {
  const srcFiles = walk(SRC_ROOT);

  it("discovers source files (sanity check)", () => {
    expect(srcFiles.length).toBeGreaterThan(0);
  });

  it("no cross-layer violations", () => {
    const allViolations: Violation[] = [];
    for (const file of srcFiles) {
      allViolations.push(...scanFile(file));
    }
    if (allViolations.length > 0) {
      const byFile = new Map<string, Violation[]>();
      for (const v of allViolations) {
        const list = byFile.get(v.file) ?? [];
        list.push(v);
        byFile.set(v.file, list);
      }
      const report = Array.from(byFile.entries())
        .map(
          ([f, vs]) =>
            `  ${f}\n${vs.map((v) => `    L${v.line} [${v.from}→${v.to}] ${v.text}`).join("\n")}`,
        )
        .join("\n\n");
      throw new Error(
        `Cross-layer dependency violations found:\n\n${report}\n\n` +
          `Allowed matrix: see top of this test file. ` +
          `To fix: invert the dependency (the lower layer should expose a port/interface, ` +
          `and the higher layer should depend on that interface).`,
      );
    }
    expect(allViolations).toEqual([]);
  });
});
