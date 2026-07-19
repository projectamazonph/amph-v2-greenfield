/**
 * STORY-051 — Sentry wiring regression guards.
 *
 * Sentry is framework glue. We can't easily unit-test that errors
 * actually reach Sentry.io, but we can statically assert that the
 * required wiring files exist and that Sentry never leaks into the
 * domain/usecases/ports layers (SOLID dependency direction).
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

describe("STORY-051 Sentry wiring", () => {
  it("has client, server, and edge Sentry config files", () => {
    expect(exists(join(ROOT, "src/sentry.client.config.ts"))).toBe(true);
    expect(exists(join(ROOT, "src/sentry.server.config.ts"))).toBe(true);
    expect(exists(join(ROOT, "src/sentry.edge.config.ts"))).toBe(true);
  });

  it("has instrumentation.ts that loads server and edge configs", () => {
    const path = join(ROOT, "instrumentation.ts");
    expect(exists(path)).toBe(true);
    const body = readFileSync(path, "utf8");
    expect(body).toMatch(/sentry\.server\.config/);
    expect(body).toMatch(/sentry\.edge\.config/);
  });

  it("wraps next.config.ts with withSentryConfig", () => {
    const path = join(ROOT, "next.config.ts");
    const body = readFileSync(path, "utf8");
    expect(body).toMatch(/withSentryConfig/);
    expect(body).toMatch(/@sentry\/nextjs/);
  });

  it("does NOT import @sentry/nextjs in domain, usecases, or ports", () => {
    const forbidden = ["src/domain", "src/usecases", "src/ports"];
    const violations: string[] = [];
    for (const dir of forbidden) {
      for (const file of walk(join(ROOT, dir))) {
        const body = readFileSync(file, "utf8");
        if (/from\s+["']@sentry\/nextjs["']/.test(body)) {
          violations.push(relative(ROOT, file));
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
