/**
 * SOLID Compliance — I (Interface Segregation).
 *
 * Rule 6 of 8.
 *
 * Each port interface in src/ports/ SHOULD have a focused,
 * cohesive set of methods. A "god port" (one interface with many
 * unrelated methods) is a violation of ISP — clients are forced
 * to depend on methods they don't use.
 *
 * How this is verified:
 *   - For each port interface (declared with `export interface IFoo`),
 *     count its methods.
 *   - If a port has more than MAX_METHODS_PER_PORT methods, that's
 *     a violation.
 *
 * Current threshold: 12 methods. Generous on purpose — real-world
 * repo ports (e.g. IUserRepository) legitimately have several query
 * methods. The threshold catches god-ports like "IDoEverything".
 *
 * Why: Tighter ISP forces ports to be split into focused interfaces
 * (e.g. IUserReader + IUserWriter). Easier to mock in tests,
 * easier to implement incrementally, easier to swap.
 *
 * Allow-list:
 *   - src/ports/repositories/* repositories legitimately have
 *     5-10 methods (list, find, create, update, delete, by-X, etc.)
 *   - src/ports/rendering/CertificateRenderer.ts is a single-method
 *     interface (render).
 *   - src/ports/email/IEmailSender.ts: single send() method.
 *
 * Strict mode: any port exceeding MAX_METHODS_PER_PORT = CI failure.
 * To grant an exemption, add the port file to MAX_METHODS_EXEMPT
 * with a justifying comment.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PORTS = join(process.cwd(), "src", "ports");

const MAX_METHODS_PER_PORT = 12;

// Files exempt from the threshold (with justification).
const MAX_METHODS_EXEMPT = new Set<string>([
  // (none today — repo ports are all under the threshold)
]);

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

function countInterfaceMethods(body: string): {
  name: string;
  methods: string[];
}[] {
  const results: { name: string; methods: string[] }[] = [];
  const ifaceRe = /export\s+interface\s+(\w+)\s*\{([\s\S]*?)\n\}/g;
  let m: RegExpExecArray | null;
  while ((m = ifaceRe.exec(body)) !== null) {
    const name = m[1] ?? "<unnamed>";
    const block = m[2] ?? "";
    // Method = a line that looks like `  methodName(...):` or
    // `  methodName(` followed by parameters.
    // Skip `:` followed by `(` (constructor-like) and skip
    // non-function members.
    const methodRe = /^\s*(\w+)\s*(<[^>]*>)?\s*\(/gm;
    const methods: string[] = [];
    let pm: RegExpExecArray | null;
    while ((pm = methodRe.exec(block)) !== null) {
      const methodName = pm[1] ?? "";
      // Filter out keywords (if/for/return) and obvious non-methods
      if (
        methodName === "if" ||
        methodName === "for" ||
        methodName === "while" ||
        methodName === "switch" ||
        methodName === "return"
      ) {
        continue;
      }
      methods.push(methodName);
    }
    if (methods.length > 0) {
      results.push({ name, methods });
    }
  }
  return results;
}

describe("SOLID compliance: ports are not god-ports (Interface Segregation)", () => {
  const portFiles = walk(PORTS);

  it("discovers port files (sanity check)", () => {
    expect(portFiles.length).toBeGreaterThan(0);
  });

  it.each(portFiles)("%s has interfaces with bounded method counts", (file) => {
    const rel = relative(process.cwd(), file);
    if (MAX_METHODS_EXEMPT.has(rel)) return;
    const body = readFileSync(file, "utf8");
    const interfaces = countInterfaceMethods(body);
    const violations: string[] = [];
    for (const iface of interfaces) {
      if (iface.methods.length > MAX_METHODS_PER_PORT) {
        violations.push(
          `${iface.name} has ${iface.methods.length} methods ` +
            `(${iface.methods.join(", ")}). ` +
            `Threshold is ${MAX_METHODS_PER_PORT}. ` +
            `Split into focused interfaces (e.g. Reader/Writer).`,
        );
      }
      // Minimum sanity: an interface should have at least one method
      if (iface.methods.length === 0) {
        // Already filtered — nothing to do
      }
    }
    expect(
      violations,
      `${rel} has port interfaces exceeding the god-port threshold:\n` +
        violations.map((v) => `  - ${v}`).join("\n"),
    ).toEqual([]);
  });
});
