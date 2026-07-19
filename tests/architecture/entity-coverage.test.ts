/**
 * TDD Compliance — Rule 8 of 8.
 *
 * Every domain entity (src/domain/entities/*.ts) MUST have at
 * least one unit test. Entities are the heart of the business
 * model — invariant enforcement (validation, state transitions,
 * factory return shapes) lives in entity factory functions, and
 * every factory branch is TDD-required.
 *
 * Test files live in either:
 *   - src/domain/entities/__tests__/{Name}.test.ts (co-located)
 *   - tests/unit/domain/entities/{Name}.test.ts (in the unit suite)
 *
 * Why: A factory that returns `{ ok: true, value }` has many
 * error branches (invalid_X, missing_field, etc.). Each branch
 * is a behaviour the application relies on. A test file that
 * covers only the happy path misses most of the contract.
 *
 * Strict mode: any entity without a test = CI failure.
 *
 * Note: This test mirrors use-case-coverage.test.ts but for the
 * domain layer. The pattern is identical because the project's
 * TDD discipline treats entities and use cases symmetrically.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ENTITIES = join(process.cwd(), "src", "domain", "entities");
const CO_LOCATED = join(ENTITIES, "__tests__");
const UNIT_DIR = join(process.cwd(), "tests", "unit", "domain", "entities");

function listEntities(): string[] {
  return readdirSync(ENTITIES)
    .filter((f) => f.endsWith(".ts"))
    .filter((f) => !f.endsWith(".d.ts"))
    .filter((f) => !f.endsWith(".test.ts"))
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

describe("TDD compliance: every domain entity has a test file", () => {
  const entities = listEntities();

  it("discovers entities (sanity check)", () => {
    expect(entities.length).toBeGreaterThan(0);
  });

  it.each(entities)("%s has a test file", (name) => {
    expect(
      hasTestFile(name),
      `Missing test for entity "${name}". ` +
        `Create src/domain/entities/__tests__/${name}.test.ts or ` +
        `tests/unit/domain/entities/${name}.test.ts before merging. ` +
        `Entity factory invariants are TDD-mandatory.`,
    ).toBe(true);
  });

  it("each entity test contains real assertions (not just stubs)", () => {
    for (const name of entities) {
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
      const realIts = (body.match(/\bit\(/g) ?? []).length;
      const todoIts = (body.match(/\bit\.todo\(/g) ?? []).length;
      const realAsserts =
        (body.match(/\bexpect\(/g) ?? []).length +
        (body.match(/\bassert[A-Z]\w*\(/g) ?? []).length;
      expect(
        realIts - todoIts > 0 && realAsserts > 0,
        `Entity test ${path} has no real assertions ` +
          `(${realIts - todoIts} it() calls, ${realAsserts} expect() calls).`,
      ).toBe(true);
    }
  });
});
