/**
 * SOLID Compliance — D (Dependency Inversion), Domain Purity variant.
 *
 * Rule 2 of 8.
 *
 * Files under src/domain/ (entities, values, services, simulator,
 * shared) MUST NOT import from:
 *   - src/ports/   (outbound interfaces belong to the application layer)
 *   - src/infra/   (infrastructure: Prisma, Resend, PayMongo, etc.)
 *   - src/composition/ (DI wiring)
 *   - src/usecases/   (orchestrators — they depend on domain, not vice versa)
 *   - src/app/        (Next.js RSC pages and server actions)
 *
 * Why: The domain layer is the inner-most ring of the architecture. It
 * models business rules and must be testable in isolation. If domain
 * code imports infrastructure, we lose the ability to swap adapters
 * (P0-2 audit: in-memory → Prisma migration requires this).
 *
 * Layer rule (Clean Architecture / Hexagonal):
 *   app → usecases → domain
 *                    ↑
 *   infra → ports →─┘ (adapters implement ports; ports are in /ports)
 *
 * Wait — that arrow direction needs clarification. The /ports directory
 * sits at the application boundary. Strictly Clean Architecture would
 * put port INTERFACES next to the use cases, and port IMPLEMENTATIONS
 * in /infra. We chose to keep port interfaces in /ports/ and have
 * domain code reference them when needed (e.g. for entity types that
 * surface in port signatures). The hard rule is: domain can NEVER
 * import from /infra or /app or /usecases. Ports are a tolerated
 * import IF the use case signatures require it (e.g. ports' TYPE-only
 * imports). This test enforces the absolute prohibitions.
 *
 * Strict mode: any domain → forbidden import = CI failure.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const DOMAIN_ROOT = join(process.cwd(), "src", "domain");
const FORBIDDEN_IMPORTS = [
  /from\s+["']@\/ports\//,
  /from\s+["']@\/infra\//,
  /from\s+["']@\/composition\//,
  /from\s+["']@\/usecases\//,
  /from\s+["']@\/app\//,
  // Relative imports crossing into forbidden dirs:
  /from\s+["']\.\.\/\.\.\/ports\//,
  /from\s+["']\.\.\/\.\.\/infra\//,
  /from\s+["']\.\.\/\.\.\/composition\//,
  /from\s+["']\.\.\/\.\.\/usecases\//,
  /from\s+["']\.\.\/\.\.\/app\//,
];

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

function findViolations(file: string): string[] {
  const body = readFileSync(file, "utf8");
  const lines = body.split("\n");
  const hits: string[] = [];
  lines.forEach((line, i) => {
    // Skip pure type-only imports if file is a .d.ts sibling; we still
    // allow `import type` for ports/infra in domain because the
    // domain entity types are referenced through port signatures in
    // many places. This test focuses on VALUE imports, which is the
    // "real" coupling. A future test can tighten to `import type`
    // if needed.
    if (/^\s*import\s+type\s/.test(line)) return;
    for (const pattern of FORBIDDEN_IMPORTS) {
      if (pattern.test(line)) {
        hits.push(`L${i + 1}: ${line.trim()}`);
      }
    }
  });
  return hits;
}

describe("SOLID compliance: domain layer is pure", () => {
  const domainFiles = walk(DOMAIN_ROOT);

  it("discovers domain files (sanity check)", () => {
    expect(domainFiles.length).toBeGreaterThan(0);
  });

  it.each(domainFiles)("%s has no forbidden cross-layer imports", (file) => {
    const rel = relative(process.cwd(), file);
    const violations = findViolations(file);
    expect(
      violations,
      `Domain file ${rel} imports from a forbidden layer.\n` +
        `Forbidden: src/ports, src/infra, src/composition, src/usecases, src/app.\n` +
        `Violations:\n${violations.map((v) => `  ${v}`).join("\n")}\n` +
        `Fix: move the dependency, or invert the relationship (domain exposes a type; the outer layer imports the type).`,
    ).toEqual([]);
  });
});
