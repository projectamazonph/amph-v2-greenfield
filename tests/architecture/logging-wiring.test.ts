/**
 * STORY-052 — Structured logging wiring regression guards.
 *
 * Enforces that Pino is an infrastructure adapter only and that the
 * Logger port exists for domain/usecases to depend on.
 */

import { describe, it, expect } from "vitest";
import { statSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

function exists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
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

describe("STORY-052 structured logging wiring", () => {
  it("has a Logger port", () => {
    expect(exists(join(SRC, "ports/observability/Logger.ts"))).toBe(true);
  });

  it("has a PinoLogger adapter", () => {
    expect(exists(join(SRC, "infra/observability/PinoLogger.ts"))).toBe(true);
  });

  it("has a TestLogger adapter", () => {
    expect(exists(join(SRC, "infra/observability/TestLogger.ts"))).toBe(true);
  });

  it("has withActionTracing in lib/", () => {
    expect(exists(join(SRC, "lib/withActionTracing.ts"))).toBe(true);
  });

  it("exposes logger on the production container", () => {
    const body = readFileSync(join(SRC, "composition/container.ts"), "utf8");
    expect(body).toMatch(/logger:\s*Logger/);
  });

  it("exposes logger on the test container", () => {
    const body = readFileSync(join(SRC, "composition/container.test.ts"), "utf8");
    expect(body).toMatch(/logger:\s*TestLogger/);
  });

  it("does NOT import pino outside infra/observability", () => {
    const allowed = ["src/infra/observability"];
    const violations: string[] = [];
    for (const file of walk(SRC)) {
      const rel = relative(SRC, file);
      if (allowed.some((a) => rel.startsWith(a))) continue;
      const body = readFileSync(file, "utf8");
      if (/from\s+["']pino["']/.test(body)) {
        violations.push(relative(ROOT, file));
      }
    }
    expect(violations).toEqual([]);
  });
});
