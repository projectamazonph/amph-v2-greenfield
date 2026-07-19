/**
 * SOLID Compliance — D (Dependency Inversion), use case shape variant.
 *
 * Rule 5 of 8.
 *
 * A use case class receives its collaborators as constructor
 * dependencies, and those collaborators MUST be ports (interfaces
 * in /ports) — never concrete classes (especially not concrete
 * Prisma or Resend or PayMongo classes from /infra).
 *
 * How this is verified:
 *   1. Parse the constructor's `deps` type from the source file
 *      (most use cases use the pattern
 *       `constructor(private readonly deps: SomeDepsType) {}`).
 *   2. Resolve each property's type to a file under src/.
 *   3. Assert that file lives in /ports (or is a primitive, type
 *      alias, or another use case class — both acceptable).
 *   4. Reject any property whose type resolves to /infra/ or
 *      /composition/.
 *
 * Why: If a use case depends on a concrete repo, we cannot swap
 * adapters (in-memory for tests, Prisma for production). The P0-2
 * audit explicitly flagged this as the root cause of "in-memory in
 * production" — the container wires `new PrismaUserRepository(prisma)`
 * but use cases that imported the InMemory version couldn't see
 * the difference. This rule prevents the regression from coming
 * back during future refactors.
 *
 * Strict mode: any use case that imports a concrete infra class
 * for its collaborator = CI failure.
 *
 * Allow-list (deferred exemptions):
 *   - src/usecases/RecordAuditLog.ts: takes RecordAuditLogDeps which
 *     includes IAuditLog (port) + IdGenerator (port) + Clock (port).
 *     Already compliant.
 *   - src/usecases/SignUp.ts / src/usecases/SignIn.ts: take primitive
 *     IdGenerator/Clock + port-shaped passwordHasher / jwt / etc.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SRC = join(process.cwd(), "src");
const USECASES = join(SRC, "usecases");
const PORTS = join(SRC, "ports");

function listUseCaseFiles(): string[] {
  return readdirSync(USECASES)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".test.ts"))
    .filter((f) => !f.endsWith(".d.ts"))
    .filter((f) => f !== "index.ts" && f !== "types.ts")
    .map((f) => join(USECASES, f));
}

// Given a use case file, find its `Deps` interface name and
// extract the property names. Returns array of dep names like
// ["courseRepo", "recordAuditLog"].
function extractDepsProperties(file: string): string[] {
  const body = readFileSync(file, "utf8");
  // Find the largest interface in the file (heuristic: use cases
  // typically have one main Deps interface, often named {Name}Deps).
  const ifaceRe = /export\s+interface\s+(\w*Deps\w*)\s*\{([\s\S]*?)\n\}/g;
  const candidates: { name: string; body: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(body)) !== null) {
    candidates.push({ name: m[1] ?? "", body: m[2] ?? "" });
  }
  if (candidates.length === 0) return [];
  // Pick the one with the most properties (the "main" deps interface)
  const main = candidates.reduce((a, b) =>
    a.body.length > b.body.length ? a : b,
  );
  const propRe = /^\s*(\w+)\s*:/gm;
  const props: string[] = [];
  let pm: RegExpExecArray | null;
  while ((pm = propRe.exec(main.body)) !== null) {
    if (pm[1]) props.push(pm[1]);
  }
  return props;
}

// Map a dep name to the import that brings it in.
// E.g. for "courseRepo" we look for `import type { CourseRepository } from "@/ports/..."`.
function resolveDepImport(file: string, depName: string): string | null {
  const body = readFileSync(file, "utf8");
  // Find the line that defines the dep's type
  const deps = extractDepsProperties(file);
  if (!deps.includes(depName)) return null;
  // Look at the type of this dep in the Deps interface
  const ifaceRe = /export\s+interface\s+(\w*Deps\w*)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(body)) !== null) {
    const block = m[2] ?? "";
    const propLine = new RegExp(`\\b${depName}\\s*:\\s*([^;]+);`);
    const pm = propLine.exec(block);
    if (!pm) continue;
    const typeExpr = (pm[1] ?? "").trim();
    // Extract identifier from type expression (e.g. "CourseRepository"
    // or "CourseRepository | null" or "Pick<X, Y>")
    // First look for the leading identifier
    const idMatch = typeExpr.match(/^(\w+)/);
    if (!idMatch) continue;
    const typeName = idMatch[1];
    if (!typeName) continue;
    // Now find which import brings this type in
    const importRe = new RegExp(
      `import\\s+(?:type\\s+)?\\{[^}]*\\b${typeName}\\b[^}]*\\}\\s+from\\s+["']([^"']+)["']`,
    );
    const im = importRe.exec(body);
    if (im) return im[1] ?? null;
    // Could be a "default" or aliased import — skip
  }
  return null;
}

function resolveImportPath(fromFile: string, spec: string): string | null {
  if (spec.startsWith("@/")) {
    return join(SRC, spec.slice(2));
  }
  if (spec.startsWith(".")) {
    return join(fromFile, "..", spec);
  }
  return null;
}

describe("SOLID compliance: use cases depend on ports, not concrete infra", () => {
  const files = listUseCaseFiles();

  it("discovers use case files (sanity check)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s's deps resolve to ports (not concrete infra)", (file) => {
    const rel = relative(process.cwd(), file);
    const deps = extractDepsProperties(file);
    if (deps.length === 0) return; // no Deps interface (e.g. value-object UC)
    const violations: string[] = [];
    for (const dep of deps) {
      const importSpec = resolveDepImport(file, dep);
      if (!importSpec) {
        // Couldn't resolve — might be a type alias defined in the same
        // file. That's fine.
        continue;
      }
      const resolved = resolveImportPath(file, importSpec);
      if (!resolved) continue;
      let rel2: string;
      try {
        rel2 = relative(SRC, resolved);
      } catch {
        continue;
      }
      // Reject if the dep comes from /infra or /composition
      if (rel2.startsWith("infra/") || rel2.startsWith("composition/")) {
        violations.push(
          `${dep} → ${rel2} (concrete class). ` +
            `Move the type to /ports/ and depend on the port.`,
        );
      }
    }
    expect(
      violations,
      `${rel} has use case dependencies that point to concrete classes:\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    ).toEqual([]);
  });

  it("at least one use case exists with a checked deps interface (sanity)", () => {
    // The above it.each might silently pass for files with no deps interface
    const withDeps = files.filter((f) => extractDepsProperties(f).length > 0);
    expect(
      withDeps.length,
      "No use case has a *Deps interface to check. Either " +
        "every use case was value-object-shaped (unlikely) or the parser is broken.",
    ).toBeGreaterThan(0);
  });
});
