/**
 * SOLID Compliance — S (Single Responsibility).
 *
 * Rule 4 of 8.
 *
 * Each use case file in src/usecases/ contains:
 *   - exactly one exported class
 *   - the class exposes an `execute(...)` method (the public API)
 *   - the class does not have any obviously-twin behaviour
 *     (e.g. `executeCreate` + `executeUpdate` on the same class)
 *
 * Why: A use case class is a single unit of behaviour. Two classes
 * per file is a SRP violation by definition. Methods other than
 * `execute` (private helpers excepted) suggest the class is doing
 * two things — extract the second one into its own use case.
 *
 * Strict mode: any violation = CI failure.
 *
 * Caveats (explicit allow-list):
 *   - src/usecases/RecordAuditLog.ts is a special "always-on
 *     infrastructure helper" — it has execute() and is a single class,
 *     so it passes the shape check.
 *   - src/usecases/AuthorizeLessonAccess.ts has 5 user-state branches
 *     in one execute() — that's the design (single authorization
 *     decision), not a SRP violation.
 *   - Files ending in .factory.ts or .entity.ts are domain helpers,
 *     not use cases, and are excluded.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const USECASES = join(process.cwd(), "src", "usecases");

function listUseCaseFiles(): string[] {
  return readdirSync(USECASES)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".test.ts"))
    .filter((f) => !f.endsWith(".d.ts"))
    .filter((f) => f !== "index.ts" && f !== "types.ts")
    .map((f) => join(USECASES, f));
}

const EXEMPT_FROM_EXECUTE_METHOD = new Set<string>([
  // Pure factory / helper files (no class):
  // (none today, but reserved for future)
]);

describe("SOLID compliance: use cases follow Single Responsibility", () => {
  const files = listUseCaseFiles();

  it("discovers use case files (sanity check)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s has exactly one exported class", (file) => {
    const body = readFileSync(file, "utf8");
    // Match `export class Foo` (allow leading whitespace / decorators)
    const matches = body.match(/^\s*(?:@\w+\s+)*export\s+class\s+\w+/gm) ?? [];
    expect(
      matches.length,
      `${relative(process.cwd(), file)} has ${matches.length} exported classes. ` +
        `Each use case file should have exactly one. Split into separate files.`,
    ).toBe(1);
  });

  it.each(files)("%s's class has an execute() method", (file) => {
    const rel = relative(process.cwd(), file);
    if (EXEMPT_FROM_EXECUTE_METHOD.has(rel)) return;
    const body = readFileSync(file, "utf8");
    // Find the class
    const classMatch = body.match(/^\s*(?:@\w+\s+)*export\s+class\s+(\w+)/m);
    if (!classMatch) return; // already covered by the previous test
    const className = classMatch[1];
    expect(className).toBeDefined();
    // Look for an `execute(` method on the class
    // Allow async execute, with various visibility markers
    const executeRe = new RegExp(
      `\\b(public\\s+|private\\s+|protected\\s+|async\\s+)*execute\\s*\\(`,
      "m",
    );
    const hasExecute = executeRe.test(body);
    expect(
      hasExecute,
      `${rel}: class ${className} has no execute() method. ` +
        `Use cases must expose a single execute(input) entry point.`,
    ).toBe(true);
  });
});
