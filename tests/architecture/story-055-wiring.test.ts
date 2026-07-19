/**
 * STORY-055 — Tenant isolation + critical journeys + a11y wiring guards.
 */

import { describe, it, expect } from "vitest";
import { statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function exists(path: string): boolean {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

describe("STORY-055 tenant isolation + journeys + a11y wiring", () => {
  it("has an updated tenant isolation doc", () => {
    expect(exists(join(ROOT, "docs/security/tenant-isolation.md"))).toBe(true);
  });

  it("has a critical-journeys E2E spec", () => {
    expect(exists(join(ROOT, "tests/e2e/critical-journeys.spec.ts"))).toBe(true);
  });

  it("has an a11y E2E spec", () => {
    expect(exists(join(ROOT, "tests/e2e/a11y.spec.ts"))).toBe(true);
  });

  it("critical-journeys spec covers at least 6 journeys", () => {
    const body = readFileSync(join(ROOT, "tests/e2e/critical-journeys.spec.ts"), "utf8");
    const matches = body.match(/test\(/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(6);
  });
});
