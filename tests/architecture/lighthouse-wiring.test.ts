/**
 * STORY-053 — Lighthouse CI + Web Vitals wiring regression guards.
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

describe("STORY-053 Lighthouse CI + Web Vitals wiring", () => {
  it("has a lighthouserc.json config", () => {
    expect(exists(join(ROOT, "lighthouserc.json"))).toBe(true);
  });

  it("has a webVitals helper in lib/", () => {
    expect(exists(join(ROOT, "src/lib/webVitals.ts"))).toBe(true);
  });

  it("exports reportWebVitals from the helper", () => {
    const body = readFileSync(join(ROOT, "src/lib/webVitals.ts"), "utf8");
    expect(body).toMatch(/export\s+function\s+reportWebVitals/);
  });

  it("layout.tsx renders WebVitalsReporter", () => {
    const body = readFileSync(join(ROOT, "src/app/layout.tsx"), "utf8");
    expect(body).toMatch(/WebVitalsReporter/);
  });

  it("CI workflow has a lighthouse job", () => {
    const body = readFileSync(join(ROOT, ".github/workflows/ci.yml"), "utf8");
    expect(body).toMatch(/lighthouse:/);
  });
});
