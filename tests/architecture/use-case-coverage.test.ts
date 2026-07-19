/**
 * TDD Compliance — Rule 1 of 8.
 *
 * Every use case (src/usecases/*.ts) MUST have at least one
 * corresponding test file. Tests live in either:
 *   - src/usecases/__tests__/{Name}.test.ts (co-located)
 *   - tests/unit/usecases/{Name}.test.ts (in the unit tests tree)
 *
 * Why: Use cases are the public contract of the application. If a use
 * case has no test, it is unverified behaviour — TDD demands red-green
 * and a test file is the "red". This rule prevents silent drops during
 * the in-memory → Prisma migration (P0-2) when adapters get refactored.
 *
 * Strict mode (per sprint 11 plan): missing test = CI failure.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(process.cwd(), "src", "usecases");
const CO_LOCATED = join(ROOT, "__tests__");
const UNIT_DIR = join(process.cwd(), "tests", "unit", "usecases");

function listUseCases(): string[] {
  return readdirSync(ROOT)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".d.ts"))
    .filter((f) => f !== "index.ts" && f !== "types.ts")
    .map((f) => f.replace(/\.ts$/, ""));
}

function hasTestFile(name: string): boolean {
  const coLocated = join(CO_LOCATED, `${name}.test.ts`);
  const inUnitDir = join(UNIT_DIR, `${name}.test.ts`);
  try {
    if (statSync(coLocated).isFile()) return true;
  } catch {
    // not present
  }
  try {
    if (statSync(inUnitDir).isFile()) return true;
  } catch {
    // not present
  }
  return false;
}

describe("TDD compliance: every use case has a test file", () => {
  const useCases = listUseCases();

  it("discovers at least one use case (sanity check)", () => {
    expect(useCases.length).toBeGreaterThan(0);
  });

  it.each(useCases)("%s has a test file", (name) => {
    expect(
      hasTestFile(name),
      `Missing test for use case "${name}". ` +
        `Create src/usecases/__tests__/${name}.test.ts or ` +
        `tests/unit/usecases/${name}.test.ts before merging.`,
    ).toBe(true);
  });

  it("contains a real test (not just `it.todo`)", () => {
    for (const name of useCases) {
      if (!hasTestFile(name)) continue;
      const candidates = [
        join(CO_LOCATED, `${name}.test.ts`),
        join(UNIT_DIR, `${name}.test.ts`),
      ];
      const path = candidates.find((p) => {
        try {
          return statSync(p).isFile();
        } catch {
          return false;
        }
      });
      if (!path) continue;
      const body = readFileSync(path, "utf8");
      // Each test file must contain at least one real assertion or
      // a non-todo `it(...)` call.
      const realIts = (body.match(/\bit\(/g) ?? []).length;
      const todoIts = (body.match(/\bit\.todo\(/g) ?? []).length;
      const realAsserts =
        (body.match(/\bexpect\(/g) ?? []).length +
        (body.match(/\bassert[A-Z]\w*\(/g) ?? []).length;
      expect(
        realIts - todoIts > 0 && realAsserts > 0,
        `Test file ${path} for use case "${name}" has no real assertions ` +
          `(${realIts - todoIts} it() calls, ${realAsserts} expect() calls). ` +
          `TDD requires a real test, not a stub.`,
      ).toBe(true);
    }
  });
});
